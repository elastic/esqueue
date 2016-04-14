import User from '../lib/index'
import expect from 'expect.js';

describe('User class', function () {
  it('should return the name', function () {
    var user = new User('test', 'user');

    expect(user.getName()).to.equal('test user');
  });
});