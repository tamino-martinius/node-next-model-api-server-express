'use strict';

const NextModelApiServerExpress = require('..');
const NextModelApiRouter = require('../../next-model-api-router');
const NextModel = require('next-model');

const expect = require('expect.js');
const expectChange = require('expect-change');
const sinon = require('sinon');

const express = require('express');

const httpMocks = require('node-mocks-http')
const pluralize = require('pluralize');
const URL = require('url');
const querystring = require('querystring');

const lodash = require('lodash');
const filter = lodash.filter;
const includes = lodash.includes;
const isArray = lodash.isArray;
const keys = lodash.keys;
const map = lodash.map;
const omit = lodash.omit;
const orderBy = lodash.orderBy;
const values = lodash.values;
const words = lodash.words;

const mockConnector = function(data) {
  const all = (model) => {
    let result = filter(data, model.defaultScope);
    const order = model.defaultOrder;
    if (order) result = orderBy(result, keys(order), values(order));
    result = result.splice(model._skip, model._limit || Number.MAX_VALUE);
    return Promise.resolve(result);
  };
  const first = (model) => all(model).then(result => result[0]);
  const last = (model) => all(model).then(result => result[result.length - 1]);
  const count = (model) => all(model).then(result => result.length);
  const save = (model) => Promise.resolve(model.id = 1);
  return { all, first, last, count, save };
};

describe('NextModelApiServerExpress', function() {
  this.timeout(10000);

  def('router', () => new NextModelApiRouter({
    domain: $apiDomain,
    path: $apiPath,
    version: $apiVersion,
  }));

  def('apiDomain', () => undefined);
  def('apiPath', () => undefined);
  def('apiVersion', () => undefined);

  def('app', () => express());

  def('server', () => new NextModelApiServerExpress($app, $router));

  def('items', () => []);

  def('BaseModel', () => class BaseModel extends NextModel {
    static get connector() {
      return mockConnector($items);
    }
  });

  def('User', () => class User extends $BaseModel {
    static get modelName() { return 'User'; }

    static get schema() {
      return {
        id: { type: 'integer' },
        name: { type: 'string' },
        age: { type: 'integer' },
      };
    }

    static get tableName() { return $tableName;}

    static get defaultScope() { return $defaultScope; }
    static get defaultOrder() { return $defaultOrder; }

    static get _skip() { return $skip; }
    static get _limit() { return $limit; }
  });

  def('tableName', () => 'users');

  def('defaultScope', () => undefined);
  def('defaultOrder', () => undefined);

  def('skip', () => undefined);
  def('limit', () => undefined);

  beforeEach(function() {
    $router.resource($User.modelName, {
      defaults: $resourceDefaults,
      only: $resourceOnly,
      except: $resourceExcept,
      collection: $resourceCollection,
      member: $resourceMember,
    });
  });

  def('resourceDefaults', () => undefined);
  def('resourceOnly', () => undefined);
  def('resourceExcept', () => undefined);
  def('resourceCollection', () => undefined);
  def('resourceMember', () => undefined);

  describe('#controller()', function() {
    def('controller', () => $server.controller($Klass, $actions));
    def('Klass', () => $User);
    def('actions', () => undefined);

    def('request', () => httpMocks.createRequest({
      method: $method || 'POST',
      url: $url,
      params: $params,
      body: $body,
      query: $query,
    }));

    def('method', () => undefined);
    def('params', () => undefined);
    def('body', () => undefined);
    def('query', () => undefined);

    def('response', () => httpMocks.createResponse());

    def('items', () => [
      { name: 'foo', age: 18 },
      { name: 'foo', age: 21 },
      { name: 'bar', age: 21 },
    ]);

    subject(() => {
      return new Promise(function(resolve, reject) {
        $response.end = () => {
          let data = JSON.parse($response._getData());
          if (isArray(data)) {
            data = map(data, item => omit(item, 'id'));
          }
          resolve(data);
        };
        $controller.handle($request, $response, (err) => reject(err));
      });
    });

    describe('default actions', function() {
      context('all', function() {
        def('url', '/users');

        it('returns all users', function() {
          return $subject.then(response => {
            expect(response).to.eql($items);
          });
        });
      });
    });
  });
});
