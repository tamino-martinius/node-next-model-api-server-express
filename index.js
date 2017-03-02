'use strict';

const lodash = require('lodash');
const express = require('express');
const pluralize = require('pluralize');

const compact = lodash.compact;
const isArray = lodash.isArray;
const toLower = lodash.toLower;

module.exports = class NextModelApiServerExpress {
  constructor(app, Klass) {
    this.app = app;
    this.Klass = Klass;
    this.router = express.Router();

    route('all', false, (req, res) => {
      respond(res, this.scopedKlass(req).all);
    });

    route('first', false, (req, res) => {
      respond(res, this.scopedKlass(req).first);
    });

    route('last', false, (req, res) => {
      respond(res, this.scopedKlass(req).last);
    });

    route('count', false, (req, res) => {
      respond(res, this.scopedKlass(req).count);
    });

    route('insert', false, (req, res) => {
      respond(res, this.klass(req).save());
    });

    route('update', true, (req, res) => {
      respond(res, this.klass(req).save());
    });

    route('delete', true, (req, res) => {
      respond(res, this.klass(req).delete());
    });

    this.app.use(this.apiPath, this.router);
  }

  respond(res, promise) {
    promise
      .then(data => this.handleData(res, data))
      .catch(err => this.handleError(res, err))
    ;
  }

  handleData(res, data) {
    let content;
    if (isArray(data)) {
      content = data.map(item => item.attributes);
    } else {
      content = data.attributes;
    }
    res.json(content);
  }

  handleError(res, err) {
    res.json({ err: err });
  }

  route(action, isInstanceAction, fn) {
    const path = this.path(action, isInstanceAction);
    const method = this.actionMethod(action);
    this.router.route(path)[method](fn);
  }

  actionPath(action) {
    const defaults = {
      first: '/first',
      last: '/last',
      count: '/count',
      insert: '/create',
      delete: '/delete',
    };
    return this.Klass[action + 'ActionPath'] || defaults[action] || '';
  }

  path(action, isInstanceAction) {
    const name = pluralize(this.name, isInstanceAction ? 1 : 2);
    const id = isInstanceAction ? ':id' : '';
    const actionPath = trim(this.actionPath(action), '/');
    const pathFragments = compact([name, id, actionPath]);
    return pathFragments.join('/') + this.postfix;
  }

  scopedKlass(req) {
    return class Klass extends this.Klass {

    };
  }

  klass(req) {

  }

  get path() {
    return trim(this.Klass.routePath, '/');
  }

  get version() {
    return trim(this.Klass.routeVersion, '/');
  }

  get name() {
    return trim(this.Klass.routeName || this.Klass.tableName, '/');
  }

  get postfix() {
    return get.Klass.routePostfix || '';
  }
};
