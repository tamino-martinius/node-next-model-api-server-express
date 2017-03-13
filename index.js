'use strict';

const lodash = require('lodash');
const express = require('express');
const pluralize = require('pluralize');

const assign = lodash.assign;
const defaults = lodash.defaults;
const filter = lodash.filter;
const isArray = lodash.isArray;
const omit = lodash.omit;

module.exports = class NextModelApiServerExpress {
  static responseHeaders(req, res, next) {
    const headers = {
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With, X-Amz-Date, X-Api-Key',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PATCH,PUT,DELETE',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Origin': req.get('Origin'),
    };
    if (req.method === 'OPTIONS') {
      const maxAge = 2592000;
      headers['Cache-Control'] = 'public, max-age=' + maxAge;
      headers['Expires'] = new Date(Date.now() + maxAge * 1000).toUTCString();
      res.set(headers);
      res.sendStatus(200);
    } else {
      res.set(headers);
      return next();
    }
  }

  static respond(res, promise) {
    promise
      .then(data => this.handleData(res, data))
      .catch(err => this.handleError(res, err))
    ;
  }

  static handleData(res, data) {
    let content = data;
    if (isArray(data)) {
      content = data.map(item => item.attributes);
    } else if (data && data.attributes) {
      content = data.attributes;
    }
    res.json(content);
  }

  static handleError(res, err) {
    res.json({ err: err });
  }

  static payload(req) {
    return assign({}, req.params, req.body, req.query);
  }

  static scopedKlass(Klass, req) {
    const data = this.payload(req);
    return class ScopedKlass extends Klass {
      static get defaultScope() {
        return JSON.parse(data.scope);
      }

      static get defaultOrder() {
        return JSON.parse(data.order);
      }

      static get _skip() {
        return JSON.parse(data.skip);
      }

      static get _limit() {
        return JSON.parse(data.limit);
      }
    };
  }

  static klass(Klass, req) {
    const data = JSON.parse(this.payload(req).attributes);
    const identifier = Klass.identifier;
    if (data[identifier]) {
      const query = { [identifier]: data[identifier] };
      return Klass.model.where(query).first
       .then(klass => klass.assign(omit(data, identifier)));
    } else {
      return Klass.model.promiseBuild(data);
    }
  }

  constructor(app, router) {
    this.app = app;
    this.root = router.root;
    this.routes = router.routes;
    app.use(this.root, this.constructor.responseHeaders);
  }

  defaultActions(Klass) {
    return {
      all: (req, res) => {
        this.constructor.respond(res,
          this.constructor.scopedKlass(Klass, req).all
        );
      },
      first: (req, res) => {
        this.constructor.respond(res,
          this.constructor.scopedKlass(Klass, req).first
        );
      },
      last: (req, res) => {
        this.constructor.respond(res,
          this.constructor.scopedKlass(Klass, req).last
        );
      },
      count: (req, res) => {
        this.constructor.respond(res,
          this.constructor.scopedKlass(Klass, req).count
        );
      },
      create: (req, res) => {
        this.constructor.respond(res,
          this.constructor.klass(Klass, req)
          .then(klass => klass.save())
        );
      },
      show: (req, res) => {
        this.constructor.respond(res,
          this.constructor.klass(Klass, req)
        );
      },
      update: (req, res) => {
        this.constructor.respond(res,
          this.constructor.klass(Klass, req)
          .then(klass => klass.save())
        );
      },
      delete: (req, res) => {
        this.constructor.respond(res,
          this.constructor.klass(Klass, req)
          .then(klass => klass.delete())
        );
      },
    };
  }

  controller(Klass, actionsParam) {
    const router = express.Router();
    const actions = defaults(actionsParam, this.defaultActions(Klass));
    for (const route of this.routesForClass(Klass)) {
      const action = actions[route.action];
      if (action) {
        router.route(route.url)[route.method](action);
      } else {
        console.log(`can't find action '${action}' for model '${Klass.modelName}'`);
      }
    }
    this.app.use(this.root, router);
  }

  routesForClass(Klass) {
    return filter(this.routes, (route) => (
      route.modelName === Klass.modelName
    ));
  }
};
