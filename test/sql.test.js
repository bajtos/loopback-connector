var expect = require('chai').expect;
var SQLConnector = require('../lib/sql');
var ParameterizedSQL = SQLConnector.ParameterizedSQL;
var testConnector = require('./connectors/test-sql-connector');

var juggler = require('loopback-datasource-juggler');
var ds = new juggler.DataSource({
  connector: testConnector,
  debug: true
});
var connector;
var Customer;
var Order;
var Store;

describe('sql connector', function() {
  before(function() {
    connector = ds.connector;
    connector._tables = {};
    connector._models = {};
    Customer = ds.createModel('customer',
      {
        name: {
          id: true,
          type: String,
          testdb: {
            column: 'NAME',
            dataType: 'VARCHAR',
            dataLength: 32
          }
        }, vip: {
        type: Boolean,
        testdb: {
          column: 'VIP'
        }
      },
        address: String
      },
      {testdb: {table: 'CUSTOMER'}});
    Order = ds.createModel('order',
      {
        id: {
          id: true
        },
        date: Date
      });
    Store = ds.createModel('store',
      {
        id: {
          id: true,
          type: String
        },
        state: String
      });
    // Relations
    Customer.hasMany(Order, {as: 'orders', foreignKey: 'customer_name'});
    Order.belongsTo(Customer, {as: 'customer', foreignKey: 'customer_name'});
    Order.belongsTo(Store, {as: 'store', foreignKey: 'store_id'});
    Store.hasMany(Order, {as: 'orders', foreignKey: 'store_id'});
    Store.hasMany(Customer, {
      as: 'customers',
      through: Order,
      foreignKey: 'store_id',
      keyThrough: 'customer_name'
    });
    Customer.belongsTo(Store, {as: 'favorite_store', foreignKey: 'favorite_store'});
    Store.hasMany(Customer, {as: 'customers_fav', foreignKey: 'favorite_store'});
  });

  it('should map table name', function() {
    var table = connector.table('customer');
    expect(table).to.eql('CUSTOMER');
  });

  it('should map column name', function() {
    var column = connector.column('customer', 'name');
    expect(column).to.eql('NAME');
  });

  it('should find column metadata', function() {
    var column = connector.columnMetadata('customer', 'name');
    expect(column).to.eql({
      column: 'NAME',
      dataType: 'VARCHAR',
      dataLength: 32
    });
  });

  it('should map property name', function() {
    var prop = connector.propertyName('customer', 'NAME');
    expect(prop).to.eql('name');
  });

  it('should map id column name', function() {
    var idCol = connector.idColumn('customer');
    expect(idCol).to.eql('NAME');
  });

  it('should find escaped id column name', function() {
    var idCol = connector.idColumnEscaped('customer');
    expect(idCol).to.eql('`NAME`');
  });

  it('should find escaped table name', function() {
    var table = connector.tableEscaped('customer');
    expect(table).to.eql('`CUSTOMER`');
  });

  it('should find escaped column name', function() {
    var column = connector.columnEscaped('customer', 'vip');
    expect(column).to.eql('`CUSTOMER`.`VIP`');
  });

  it('should convert to escaped id column value', function() {
    var column = connector.idColumnValue('customer', 'John');
    expect(column).to.eql('John');
  });

  it('builds where', function() {
    var where = connector.buildWhere('customer', {name: 'John'});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME`=?',
      params: ['John']
    });
  });

  it('builds where with null', function() {
    var where = connector.buildWhere('customer', {name: null});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` IS NULL',
      params: []
    });
  });

  it('builds where with inq', function() {
    var where = connector.buildWhere('customer', {name: {inq: ['John', 'Mary']}});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` IN (?,?)',
      params: ['John', 'Mary']
    });
  });

  it('builds where with or', function() {
    var where = connector.buildWhere('customer',
      {or: [{name: 'John'}, {name: 'Mary'}]});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE (`CUSTOMER`.`NAME`=?) OR (`CUSTOMER`.`NAME`=?)',
      params: ['John', 'Mary']
    });
  });

  it('builds where with and', function() {
    var where = connector.buildWhere('customer',
      {and: [{name: 'John'}, {vip: true}]});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE (`CUSTOMER`.`NAME`=?) AND (`CUSTOMER`.`VIP`=?)',
      params: ['John', true]
    });
  });

  it('builds where with a regexp string that does not have flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: '^J'
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: ['^J']
    });
  });

  it('builds where with a regexp string that has flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: '^J/i'
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: ['^J/i']
    });
  });

  it('builds where with a regexp literal that does not have flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: /^J/
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: [/^J/]
    });
  });

  it('builds where with a regexp literal that has flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: /^J/i
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: [/^J/i]
    });
  });

  it('builds where with a regexp object that does not have flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: new RegExp(/^J/)
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: [/^J/]
    });
  });

  it('builds where with a regexp object that has flags', function() {
    var where = connector.buildWhere('customer', {
      name: {
        regexp: new RegExp(/^J/i)
      }
    });
    expect(where.toJSON()).to.eql({
      sql: 'WHERE `CUSTOMER`.`NAME` REGEXP ?',
      params: [new RegExp(/^J/i)]
    });
  });

  it('builds where with nesting and/or', function() {
    var where = connector.buildWhere('customer',
      {and: [{name: 'John'}, {or: [{vip: true}, {address: null}]}]});
    expect(where.toJSON()).to.eql({
      sql: 'WHERE (`CUSTOMER`.`NAME`=?) AND ((`CUSTOMER`.`VIP`=?) OR ' +
        '(`CUSTOMER`.`ADDRESS` IS NULL))',
      params: ['John', true]
    });
  });

  it('builds order by with one field', function() {
    var orderBy = connector.buildOrderBy('customer', 'name');
    expect(orderBy).to.eql('ORDER BY `CUSTOMER`.`NAME`');
  });

  it('builds order by with two fields', function() {
    var orderBy = connector.buildOrderBy('customer', ['name', 'vip']);
    expect(orderBy).to.eql('ORDER BY `CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`');
  });

  it('builds order by with two fields and dirs', function() {
    var orderBy = connector.buildOrderBy('customer', ['name ASC', 'vip DESC']);
    expect(orderBy).to.eql('ORDER BY `CUSTOMER`.`NAME` ASC,`CUSTOMER`.`VIP` DESC');
  });

  it('builds fields for columns', function() {
    var fields = connector.buildFields('customer',
      {name: 'John', vip: true, unknown: 'Random'});
    expect(fields.names).to.eql(['`CUSTOMER`.`NAME`', '`CUSTOMER`.`VIP`']);
    expect(fields.columnValues[0].toJSON()).to.eql(
      {sql: '?', params: ['John']});
    expect(fields.columnValues[1].toJSON()).to.eql(
      {sql: '?', params: [true]});
  });

  it('builds fields for UPDATE without ids', function() {
    var fields = connector.buildFieldsForUpdate('customer',
      {name: 'John', vip: true});
    expect(fields.toJSON()).to.eql({
      sql: 'SET `CUSTOMER`.`VIP`=?',
      params: [true]
    });
  });

  it('builds fields for UPDATE with ids', function() {
    var fields = connector.buildFieldsForUpdate('customer',
      {name: 'John', vip: true}, false);
    expect(fields.toJSON()).to.eql({
      sql: 'SET `CUSTOMER`.`NAME`=?,`CUSTOMER`.`VIP`=?',
      params: ['John', true]
    });
  });

  it('builds column names for SELECT', function() {
    var cols = connector.buildColumnNames('customer');
    expect(cols).to.eql('`CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`,' +
      '`CUSTOMER`.`ADDRESS`,`CUSTOMER`.`FAVORITE_STORE`');
  });

  it('builds column names with true fields filter for SELECT', function() {
    var cols = connector.buildColumnNames('customer', {fields: {name: true}});
    expect(cols).to.eql('`CUSTOMER`.`NAME`');
  });

  it('builds column names with false fields filter for SELECT', function() {
    var cols = connector.buildColumnNames('customer', {fields: {name: false}});
    expect(cols).to.eql('`CUSTOMER`.`VIP`,`CUSTOMER`.`ADDRESS`,`CUSTOMER`.`FAVORITE_STORE`');
  });

  it('builds column names with array fields filter for SELECT', function() {
    var cols = connector.buildColumnNames('customer', {fields: ['name']});
    expect(cols).to.eql('`CUSTOMER`.`NAME`');
  });

  it('builds DELETE', function() {
    var sql = connector.buildDelete('customer', {name: 'John'});
    expect(sql.toJSON()).to.eql({
      sql: 'DELETE FROM `CUSTOMER` WHERE `CUSTOMER`.`NAME`=$1',
      params: ['John']
    });
  });

  it('builds UPDATE', function() {
    var sql = connector.buildUpdate('customer', {name: 'John'}, {vip: false});
    expect(sql.toJSON()).to.eql({
      sql: 'UPDATE `CUSTOMER` SET `CUSTOMER`.`VIP`=$1 WHERE `CUSTOMER`.`NAME`=$2',
      params: [false, 'John']
    });
  });

  it('builds SELECT', function() {
    var sql = connector.buildSelect('customer',
      {order: 'name', limit: 5, where: {name: 'John'}});
    expect(sql.toJSON()).to.eql({
      sql: 'SELECT `CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`,`CUSTOMER`.`ADDRESS`,' +
        '`CUSTOMER`.`FAVORITE_STORE` FROM `CUSTOMER` WHERE `CUSTOMER`.`NAME`=$1 ' +
        'ORDER BY `CUSTOMER`.`NAME` LIMIT 5',
      params: ['John']
    });
  });

  it('builds INSERT', function() {
    var sql = connector.buildInsert('customer', {name: 'John', vip: true});
    expect(sql.toJSON()).to.eql({
      sql: 'INSERT INTO `CUSTOMER`(`CUSTOMER`.`NAME`,`CUSTOMER`.`VIP`) VALUES($1,$2)',
      params: ['John', true]
    });
  });

  it('builds INNER JOIN', function () {
    var sql = connector.buildJoins('customer', {orders: {id: 10}});
    expect(sql.toJSON()).to.eql({
      sql:
        'INNER JOIN `ORDER` AS `orders` ' +
        'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME` AND `orders`.`ID`=? ',
      params: [10]
    });
  });

  it('builds LEFT JOIN', function () {
    var sql = connector.buildJoins('customer', {orders: {}});
    expect(sql.toJSON()).to.eql({
      sql:
        'LEFT JOIN `ORDER` AS `orders` ' +
        'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME` ',
      params: []
    });
  });

  it('builds SELECT with INNER JOIN (1:n relation)', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        orders: {
          date: {between: ['2015-01-01', '2015-01-31']}
        }
      }
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `CUSTOMER`.`NAME`,' +
                        '`CUSTOMER`.`VIP`,' +
                        '`CUSTOMER`.`ADDRESS`,' +
                        '`CUSTOMER`.`FAVORITE_STORE` ' +
        'FROM `CUSTOMER` ' +
        'INNER JOIN `ORDER` AS `orders` ' +
          'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME` ' +
          'AND `orders`.`DATE` BETWEEN $1 AND $2   ' +
        'ORDER BY `CUSTOMER`.`NAME`',
      params: ['2015-01-01', '2015-01-31']
    });
  });

  it('builds SELECT with INNER JOIN (n:n relation)', function () {
    var sql = connector.buildSelect('store', {
      where: {
        customers: {
          vip: true
        }
      }
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `STORE`.`ID`,' +
                        '`STORE`.`STATE` ' +
        'FROM `STORE` ' +
        'LEFT JOIN `ORDER` AS `customers_though` ' +
          'ON `STORE`.`ID`=`customers_though`.`STORE_ID`  ' +
        'INNER JOIN `CUSTOMER` AS `customers` ' +
          'ON `customers_though`.`CUSTOMER_NAME`=`customers`.`NAME` ' +
          'AND `customers`.`VIP`=$1   ' +
        'ORDER BY `STORE`.`ID`',
      params: [true]
    });
  });

  it('builds SELECT with JOIN with or', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        or: [{
          orders: {
            date: {between: ['2015-01-01', '2015-01-31']}
          }
        }, {
          orders: {
            date: {between: ['2015-02-01', '2015-02-31']}
          }
        }]
      }
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `CUSTOMER`.`NAME`,' +
        '`CUSTOMER`.`VIP`,' +
        '`CUSTOMER`.`ADDRESS`,' +
        '`CUSTOMER`.`FAVORITE_STORE` ' +
        'FROM `CUSTOMER` ' +
        'LEFT JOIN `ORDER` AS `orders` ' +
          'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME`  ' +
        'WHERE (' +
          '`orders`.`DATE` BETWEEN $1 AND $2' +
        ') OR (' +
          '`orders`.`DATE` BETWEEN $3 AND $4' +
        ') ' +
        'ORDER BY `CUSTOMER`.`NAME`',
      params: [
        '2015-01-01',
        '2015-01-31',
        '2015-02-01',
        '2015-02-31'
      ]
    });
  });

  it('builds SELECT with JOIN with and', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        and: [{
          orders: {
            date: {between: ['2015-01-01', '2015-01-31']}
          }
        }, {
          orders: {
            date: {between: ['2015-02-01', '2015-02-31']}
          }
        }]
      }
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `CUSTOMER`.`NAME`,' +
        '`CUSTOMER`.`VIP`,' +
        '`CUSTOMER`.`ADDRESS`,' +
        '`CUSTOMER`.`FAVORITE_STORE` ' +
        'FROM `CUSTOMER` ' +
        'LEFT JOIN `ORDER` AS `orders` ' +
          'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME`  ' +
        'WHERE (' +
          '`orders`.`DATE` BETWEEN $1 AND $2' +
        ') AND (' +
          '`orders`.`DATE` BETWEEN $3 AND $4' +
        ') ' +
        'ORDER BY `CUSTOMER`.`NAME`',
      params: [
        '2015-01-01',
        '2015-01-31',
        '2015-02-01',
        '2015-02-31'
      ]
    });
  });

  it('builds SELECT with JOIN with or and nested relation', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        or: [{
          orders: {
            store: {
              state: 'NY'
            }
          }
        }, {
          orders: {
            date: {between: ['2015-02-01', '2015-02-31']}
          }
        }]
      }
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `CUSTOMER`.`NAME`,' +
                        '`CUSTOMER`.`VIP`,' +
                        '`CUSTOMER`.`ADDRESS`,' +
                        '`CUSTOMER`.`FAVORITE_STORE` ' +
        'FROM `CUSTOMER` ' +
        'LEFT JOIN `ORDER` AS `orders` ' +
          'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME` ' +
        'LEFT JOIN `STORE` AS `orders_store` ' +
          'ON `orders`.`STORE_ID`=`orders_store`.`ID`  ' +
        'WHERE (`orders_store`.`STATE`=$1) ' +
          'OR (`orders`.`DATE` BETWEEN $2 AND $3) ' +
        'ORDER BY `CUSTOMER`.`NAME`',
      params: [
        'NY',
        '2015-02-01',
        '2015-02-31'
      ]
    });
  });

  it('builds SELECT with JOIN with or and nested relation with non relation search', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        or: [{
          orders: {
            date: {between: ['2015-01-01', '2015-01-31']},
            store: {
              state: 'NY'
            }
          }
        }, {
          orders: {
            store: {
              state: 'NY'
            },
            date: {between: ['2015-02-01', '2015-02-31']}
          }
        }]
      }
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `CUSTOMER`.`NAME`,' +
                        '`CUSTOMER`.`VIP`,' +
                        '`CUSTOMER`.`ADDRESS`,' +
                        '`CUSTOMER`.`FAVORITE_STORE` ' +
        'FROM `CUSTOMER` ' +
        'LEFT JOIN `ORDER` AS `orders` ' +
          'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME` ' +
        'LEFT JOIN `STORE` AS `orders_store` ' +
          'ON `orders`.`STORE_ID`=`orders_store`.`ID`  ' +
        'WHERE (`orders`.`DATE` BETWEEN $1 AND $2 AND `orders_store`.`STATE`=$3) ' +
          'OR (`orders`.`DATE` BETWEEN $4 AND $5 AND `orders_store`.`STATE`=$6) ' +
        'ORDER BY `CUSTOMER`.`NAME`',
      params: [
        '2015-01-01',
        '2015-01-31',
        'NY',
        '2015-02-01',
        '2015-02-31',
        'NY'
      ]
    });
  });

  it('builds SELECT with JOIN with nested or', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        or: [{
          /*jshint camelcase:false */
          favorite_store: {
            state: 'NY',
            or: [{
              orders: {
                date: {between: ['2015-01-01', '2015-01-31']}
              }
            }, {
              orders: {
                date: {between: ['2015-02-01', '2015-02-31']}
              }
            }]
          }
        }, {
          /*jshint camelcase:false */
          favorite_store: {
            state: 'baz',
            and: [{
              orders: {
                date: {between: ['2015-01-01', '2015-01-31']}
              }
            }, {
              orders: {
                date: {between: ['2015-02-01', '2015-02-31']}
              }
            }]
          }
        }]
      }
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `CUSTOMER`.`NAME`,' +
                        '`CUSTOMER`.`VIP`,' +
                        '`CUSTOMER`.`ADDRESS`,' +
                        '`CUSTOMER`.`FAVORITE_STORE` ' +
        'FROM `CUSTOMER` ' +
        'LEFT JOIN `STORE` AS `favorite_store` ' +
          'ON `CUSTOMER`.`FAVORITE_STORE`=`favorite_store`.`ID` ' +
        'LEFT JOIN `ORDER` AS `favorite_store_orders` ' +
          'ON `favorite_store`.`ID`=`favorite_store_orders`.`STORE_ID`  ' +
        'WHERE (' +
          '`favorite_store`.`STATE`=$1 AND (' +
            '`orders`.`DATE` BETWEEN $2 AND $3' +
          ') ' +
          'OR (`orders`.`DATE` BETWEEN $4 AND $5)' +
        ') OR (' +
          '`favorite_store`.`STATE`=$6 ' +
          'AND (`orders`.`DATE` BETWEEN $7 AND $8) ' +
          'AND (`orders`.`DATE` BETWEEN $9 AND $10)' +
        ') ' +
        'ORDER BY `CUSTOMER`.`NAME`',
      params: [
        'NY',
        '2015-01-01',
        '2015-01-31',
        '2015-02-01',
        '2015-02-31',
        'baz',
        '2015-01-01',
        '2015-01-31',
        '2015-02-01',
        '2015-02-31'
      ]
    });
  });

  it('builds SELECT with JOIN and order by relation columns', function () {
    var sql = connector.buildSelect('order', {
      order: ['customer.vip DESC', 'customer.name ASC']
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `ORDER`.`ID`,' +
                        '`ORDER`.`DATE`,' +
                        '`ORDER`.`CUSTOMER_NAME`,' +
                        '`ORDER`.`STORE_ID` ' +
        'FROM `ORDER` ' +
        'LEFT JOIN `CUSTOMER` AS `customer` ' +
          'ON `ORDER`.`CUSTOMER_NAME`=`customer`.`NAME`   ' +
        'ORDER BY `customer`.`VIP` DESC,' +
                 '`customer`.`NAME` ASC',
      params: []
    });
  });

  it('builds SELECT with JOIN and order by relation columns with where but no conditions', function () {
    var sql = connector.buildSelect('order', {
      where: {
        customer: {}
      },
      order: ['customer.vip DESC', 'customer.name ASC']
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `ORDER`.`ID`,' +
                        '`ORDER`.`DATE`,' +
                        '`ORDER`.`CUSTOMER_NAME`,' +
                        '`ORDER`.`STORE_ID` ' +
        'FROM `ORDER` ' +
        'LEFT JOIN `CUSTOMER` AS `customer` ' +
          'ON `ORDER`.`CUSTOMER_NAME`=`customer`.`NAME`   ' +
        'ORDER BY `customer`.`VIP` DESC,' +
                 '`customer`.`NAME` ASC',
      params: []
    });
  });

  it('builds SELECT with JOIN and order by relation columns with any where', function () {
    var sql = connector.buildSelect('order', {
      order: ['customer.vip DESC', 'customer.name ASC']
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `ORDER`.`ID`,' +
                        '`ORDER`.`DATE`,' +
                        '`ORDER`.`CUSTOMER_NAME`,' +
                        '`ORDER`.`STORE_ID` ' +
        'FROM `ORDER` ' +
        'LEFT JOIN `CUSTOMER` AS `customer` ' +
          'ON `ORDER`.`CUSTOMER_NAME`=`customer`.`NAME`   ' +
        'ORDER BY `customer`.`VIP` DESC,' +
                 '`customer`.`NAME` ASC',
      params: []
    });
  });

  it('builds SELECT with JOIN and order by nested relation columns', function () {
    var sql = connector.buildSelect('order', {
      order: ['customer.favorite_store.state DESC', 'customer.name ASC']
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `ORDER`.`ID`,' +
                        '`ORDER`.`DATE`,' +
                        '`ORDER`.`CUSTOMER_NAME`,' +
                        '`ORDER`.`STORE_ID` ' +
        'FROM `ORDER` ' +
        'LEFT JOIN `CUSTOMER` AS `customer` ' +
          'ON `ORDER`.`CUSTOMER_NAME`=`customer`.`NAME` ' +
        'LEFT JOIN `STORE` AS `customer_favorite_store` ' +
          'ON `customer`.`FAVORITE_STORE`=`customer_favorite_store`.`ID`   ' +
        'ORDER BY `customer_favorite_store`.`STATE` DESC,' +
                 '`customer`.`NAME` ASC',
      params: []
    });
  });

  it('builds SELECT with INNER JOIN and order by nested relation columns with where', function () {
    var sql = connector.buildSelect('order', {
      where: {
        date: {between: ['2015-01-01', '2015-01-31']},
        customer: {
          name: 'foo',
          /*jshint camelcase:false */
          favorite_store: {
            state: 'NY'
          }
        }
      },
      order: ['customer.favorite_store.state DESC', 'customer.name ASC']
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `ORDER`.`ID`,' +
                        '`ORDER`.`DATE`,' +
                        '`ORDER`.`CUSTOMER_NAME`,' +
                        '`ORDER`.`STORE_ID` ' +
        'FROM `ORDER` ' +
        'INNER JOIN `CUSTOMER` AS `customer` ' +
          'ON `ORDER`.`CUSTOMER_NAME`=`customer`.`NAME` ' +
          'AND `customer`.`NAME`=$1 ' +
        'INNER JOIN `STORE` AS `customer_favorite_store` ' +
          'ON `customer`.`FAVORITE_STORE`=`customer_favorite_store`.`ID` ' +
          'AND `customer_favorite_store`.`STATE`=$2  ' +
        'WHERE `ORDER`.`DATE` BETWEEN $3 AND $4 ' +
          'ORDER BY `customer_favorite_store`.`STATE` DESC,' +
                   '`customer`.`NAME` ASC',
      params: [
        'foo',
        'NY',
        '2015-01-01',
        '2015-01-31'
      ]
    });
  });

  it('builds SELECT with INNER JOIN and order by nested relation columns with partial where', function () {
    var sql = connector.buildSelect('order', {
      where: {
        date: {between: ['2015-01-01', '2015-01-31']},
        customer: {
          name: 'foo'
        }
      },
      order: ['customer.favorite_store.state DESC', 'customer.name ASC']
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `ORDER`.`ID`,' +
                        '`ORDER`.`DATE`,' +
                        '`ORDER`.`CUSTOMER_NAME`,' +
                        '`ORDER`.`STORE_ID` ' +
        'FROM `ORDER` ' +
        'INNER JOIN `CUSTOMER` AS `customer` ' +
          'ON `ORDER`.`CUSTOMER_NAME`=`customer`.`NAME` ' +
          'AND `customer`.`NAME`=$1 ' +
        'LEFT JOIN `STORE` AS `customer_favorite_store` ' +
          'ON `customer`.`FAVORITE_STORE`=`customer_favorite_store`.`ID`  ' +
        'WHERE `ORDER`.`DATE` BETWEEN $2 AND $3 ' +
          'ORDER BY `customer_favorite_store`.`STATE` DESC,' +
                   '`customer`.`NAME` ASC',
      params: [
        'foo',
        '2015-01-01',
        '2015-01-31'
      ]
    });
  });

  it('builds SELECT with multiple INNER JOIN', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        orders: {
          date: {between: ['2015-01-01', '2015-01-31']}
        },
        /*jshint camelcase:false */
        favorite_store: {
          state: 'NY'
        }
      }
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `CUSTOMER`.`NAME`,' +
                        '`CUSTOMER`.`VIP`,' +
                        '`CUSTOMER`.`ADDRESS`,' +
                        '`CUSTOMER`.`FAVORITE_STORE` ' +
        'FROM `CUSTOMER` ' +
        'INNER JOIN `ORDER` AS `orders` ' +
          'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME` ' +
          'AND `orders`.`DATE` BETWEEN $1 AND $2  ' +
        'INNER JOIN `STORE` AS `favorite_store` ' +
          'ON `CUSTOMER`.`FAVORITE_STORE`=`favorite_store`.`ID` ' +
          'AND `favorite_store`.`STATE`=$3   ' +
        'ORDER BY `CUSTOMER`.`NAME`',
      params: ['2015-01-01', '2015-01-31', 'NY']
    });
  });

  it('builds nested SELECTs', function () {
    var sql = connector.buildSelect('customer', {
      where: {
        orders: {
          store: {
            state: 'NY'
          }
        }
      }
    });

    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT DISTINCT `CUSTOMER`.`NAME`,' +
                        '`CUSTOMER`.`VIP`,' +
                        '`CUSTOMER`.`ADDRESS`,'+
                        '`CUSTOMER`.`FAVORITE_STORE` ' +
        'FROM `CUSTOMER` ' +
        'LEFT JOIN `ORDER` AS `orders` ' +
          'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME` ' +
        'INNER JOIN `STORE` AS `orders_store` ' +
          'ON `orders`.`STORE_ID`=`orders_store`.`ID` AND `orders_store`.`STATE`=$1   ' +
        'ORDER BY `CUSTOMER`.`NAME`',
      params: ['NY']
    });
  });

  it('builds count', function() {
    var sql = connector.buildCount('customer');
    expect(sql.toJSON()).to.eql({
      sql: 'SELECT count(*) as "cnt" FROM `CUSTOMER` ',
      params: []
    });
  });

  it('builds count with WHERE', function() {
    var sql = connector.buildCount('customer', {name: 'John'});
    expect(sql.toJSON()).to.eql({
      sql: 'SELECT count(*) as "cnt" FROM `CUSTOMER` WHERE `CUSTOMER`.`NAME`=$1',
      params: ['John']
    });
  });

  it('builds count with WHERE and JOIN', function() {
    var sql = connector.buildCount('customer', {
      name: 'John',
      orders: {
        date: {between: ['2015-01-01', '2015-01-31']}
      }
    });
    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT count(DISTINCT `CUSTOMER`.`NAME`) as \"cnt\" ' +
        'FROM `CUSTOMER` ' +
        'INNER JOIN `ORDER` AS `orders` ' +
        'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME` ' +
        'AND `orders`.`DATE` BETWEEN $1 AND $2  ' +
        'WHERE `CUSTOMER`.`NAME`=$3',
      params: ['2015-01-01', '2015-01-31', 'John']
    });
  });

  it('builds count with WHERE and JOIN with or', function() {
    var sql = connector.buildCount('customer', {
      name: 'John',
      or: [{
        orders: {
          date: {between: ['2015-01-01', '2015-01-31']}
        }
      }, {
        orders: {
          date: {between: ['2015-02-01', '2015-02-31']}
        }
      }]
    });
    expect(sql.toJSON()).to.eql({
      sql:
        'SELECT count(DISTINCT `CUSTOMER`.`NAME`) as \"cnt\" ' +
        'FROM `CUSTOMER` ' +
        'LEFT JOIN `ORDER` AS `orders` ' +
          'ON `CUSTOMER`.`NAME`=`orders`.`CUSTOMER_NAME`  ' +
        'WHERE `CUSTOMER`.`NAME`=$1 ' +
          'AND (`orders`.`DATE` BETWEEN $2 AND $3) ' +
          'OR (`orders`.`DATE` BETWEEN $4 AND $5)',
      params: [
        'John',
        '2015-01-01',
        '2015-01-31',
        '2015-02-01',
        '2015-02-31'
      ]
    });
  });

  it('normalizes a SQL statement from string', function() {
    var sql = 'SELECT * FROM `CUSTOMER`';
    var stmt = new ParameterizedSQL(sql);
    expect(stmt.toJSON()).to.eql({sql: sql, params: []});
  });

  it('normalizes a SQL statement from object without params', function() {
    var sql = {sql: 'SELECT * FROM `CUSTOMER`'};
    var stmt = new ParameterizedSQL(sql);
    expect(stmt.toJSON()).to.eql({sql: sql.sql, params: []});
  });

  it('normalizes a SQL statement from object with params', function() {
    var sql =
    {sql: 'SELECT * FROM `CUSTOMER` WHERE `NAME`=?', params: ['John']};
    var stmt = new ParameterizedSQL(sql);
    expect(stmt.toJSON()).to.eql({sql: sql.sql, params: ['John']});
  });

  it('should throw if the statement is not a string or object', function() {
    expect(function() {
      /*jshint unused:false */
      var stmt = new ParameterizedSQL(true);
    }).to.throw('sql must be a string');
  });

  it('concats SQL statements', function() {
    var stmt1 = {sql: 'SELECT * from `CUSTOMER`'};
    var where = {sql: 'WHERE `NAME`=?', params: ['John']};
    stmt1 = ParameterizedSQL.append(stmt1, where);
    expect(stmt1.toJSON()).to.eql(
      {sql: 'SELECT * from `CUSTOMER` WHERE `NAME`=?', params: ['John']});
  });

  it('concats string SQL statements', function() {
    var stmt1 = 'SELECT * from `CUSTOMER`';
    var where = {sql: 'WHERE `NAME`=?', params: ['John']};
    stmt1 = ParameterizedSQL.append(stmt1, where);
    expect(stmt1.toJSON()).to.eql(
      {sql: 'SELECT * from `CUSTOMER` WHERE `NAME`=?', params: ['John']});
  });

  it('should throw if params does not match placeholders', function() {
    expect(function() {
      var stmt1 = 'SELECT * from `CUSTOMER`';
      var where = {sql: 'WHERE `NAME`=?', params: ['John', 'Mary']};
      stmt1 = ParameterizedSQL.append(stmt1, where);
    }).to.throw('must match the number of params');
  });

  it('should allow execute(sql, callback)', function(done) {
    connector.execute('SELECT * FROM `CUSTOMER`', done);
  });

  it('should allow execute(sql, params, callback)', function(done) {
    connector.execute('SELECT * FROM `CUSTOMER` WHERE `NAME`=$1',
      ['xyz'], done);
  });

  it('should allow execute(sql, params, options, callback)', function(done) {
    connector.execute('SELECT * FROM `CUSTOMER` WHERE `NAME`=$1',
      ['xyz'], {transaction: true}, done);
  });

  it('should throw if params is not an array for execute()', function() {
    expect(function() {
      connector.execute('SELECT * FROM `CUSTOMER`', 'xyz', function() {
      });
    }).to.throw('params must be an array');
  });

  it('should throw if options is not an object for execute()', function() {
    expect(function() {
      connector.execute('SELECT * FROM `CUSTOMER`', [], 'xyz', function() {
      });
    }).to.throw('options must be an object');
  });

  it('should throw if callback is not a function for execute()', function() {
    expect(function() {
      connector.execute('SELECT * FROM `CUSTOMER`', [], {}, 'xyz');
    }).to.throw('callback must be a function');
  });

  it('should invoke hooks', function(done) {
    var events = [];
    connector.observe('before execute', function(ctx, next) {
      expect(ctx.req.sql).be.a('string');
      expect(ctx.req.params).be.a('array');
      events.push('before execute');
      next();
    });
    connector.observe('after execute', function(ctx, next) {
      expect(ctx.res).be.an('array');
      events.push('after execute');
      next();
    });
    Customer.find(function(err, results) {
      expect(events).to.eql(['before execute', 'after execute']);
      done(err, results);
    });
  });
});
