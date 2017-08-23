// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
/*
 * A mockup connector that extends SQL connector
 */
var util = require('util');
var SQLConnector = require('../../lib/sql');
var debug = require('debug')('loopback:connector:test-sql');

var transactionId = 0;

function MockTransaction(connector, name) {
  this.connector = connector;
  this.name = name;
  this.data = {};
}

MockTransaction.prototype.commit = function(cb) {
  var self = this;
  // Merge data from this TX to the global data var
  for (var m in this.data) {
    self.connector.data[m] = self.connector.data[m] || [];
    for (var i = 0, n = this.data[m].length; i < n; i++) {
      self.connector.data[m].push(this.data[m]);
    }
  }
  this.data = {};
  cb();
};

MockTransaction.prototype.rollback = function(cb) {
  this.data = {};
  cb();
};

exports.initialize = function initializeDataSource(dataSource, callback) {
  process.nextTick(function() {
    if (callback) {
      var connector = new TestConnector(dataSource.settings);
      connector.dataSource = dataSource;
      dataSource.connector = connector;
      callback(null, connector);
    }
  });
};

function TestConnector(settings) {
  SQLConnector.call(this, 'testdb', settings);
  this._tables = {};
  this.data = {};
}

util.inherits(TestConnector, SQLConnector);

TestConnector.prototype.escapeName = function(name) {
  return '`' + name + '`';
};

TestConnector.prototype.dbName = function(name) {
  return name.toUpperCase();
};

TestConnector.prototype.getPlaceholderForValue = function(key) {
  return '$' + key;
};

TestConnector.prototype.toColumnValue = function(prop, val) {
  return val;
};

TestConnector.prototype.escapeName = function(name) {
  return '`' + name + '`';
};

TestConnector.prototype.dbName = function(name) {
  return name.toUpperCase();
};

TestConnector.prototype.getPlaceholderForValue = function(key) {
  return '$' + key;
};

TestConnector.prototype.escapeValue = function(value) {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return "'" + value + "'";
  }
  if (value == null) {
    return 'NULL';
  }
  if (typeof value === 'object') {
    return String(value);
  }
  return value;
};

TestConnector.prototype.toColumnValue = function(prop, val, escaping) {
  return escaping ? this.escapeValue(val) : val;
};

TestConnector.prototype._buildLimit = function(model, limit, offset) {
  if (isNaN(limit)) {
    limit = 0;
  }
  if (isNaN(offset)) {
    offset = 0;
  }
  if (!limit && !offset) {
    return '';
  }
  return 'LIMIT ' + (offset ? (offset + ',' + limit) : limit);
};

TestConnector.prototype.applyPagination =
  function(model, stmt, filter) {
    /* jshint unused:false */
    var limitClause = this._buildLimit(model, filter.limit,
      filter.offset || filter.skip);
    return stmt.merge(limitClause);
  };

TestConnector.prototype.dropTable = function(model, cb) {
  var err;
  var exists = model in this._tables;
  if (!exists) {
    err = new Error('Model doesn\'t exist: ' + model);
  } else {
    delete this._tables[model];
  }
  process.nextTick(function() {
    cb(err);
  });
};

TestConnector.prototype.createTable = function(model, cb) {
  var err;
  var exists = model in this._tables;
  if (exists) {
    err = new Error('Model already exists: ' + model);
  } else {
    this._tables[model] = model;
  }
  process.nextTick(function() {
    cb(err);
  });
};

TestConnector.prototype.getInsertedId = function(model, info) {
  return info;
};

TestConnector.prototype.fromColumnValue = function(propertyDef, value) {
  return value;
};

TestConnector.prototype.beginTransaction = function(isolationLevel, cb) {
  var name = 'tx_' + transactionId++;
  cb(null, new MockTransaction(this, name));
};

TestConnector.prototype.commit = function(tx, cb) {
  tx.commit(cb);
};

TestConnector.prototype.rollback = function(tx, cb) {
  tx.rollback(cb);
};

TestConnector.prototype.executeSQL = function(sql, params, options, callback) {
  var transaction = options.transaction;
  var model = options.model;
  var useTransaction = transaction && transaction.connector === this &&
    transaction.connection;
  var data = useTransaction ? transaction.connection.data : this.data;
  var name = useTransaction ? transaction.connection.name : undefined;
  if (sql.indexOf('INSERT') === 0) {
    data[model] = data[model] || [];
    data[model].push({sql: sql, params: params});
    debug('INSERT', data, sql, name);
    callback(null, 1);
  } else {
    debug('SELECT', data, sql, name);
    var instances = data[model] || [];
    var result = sql.indexOf('count(*) as "cnt"') !== -1 ?
      [{cnt: instances.length}] : instances;
    callback(null, result);
  }
};
