
// This file cannot be written with ECMAScript 2015 because it has to load
// the Babel require hook to enable ECMAScript 2015 features!
require('babel-core/register');
require('babel-polyfill');

require('./server.js');
