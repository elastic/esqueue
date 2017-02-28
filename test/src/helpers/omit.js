import expect from 'expect.js';
import objectOmit from '../../../lib/helpers/object_omit';

describe('object omit', function () {
  let obj = {};

  beforeEach(() => {
    obj = {
      one: 1,
      two: 2,
      three: 3,
      arr: [1,2,3],
      check: 'aw yeah',
    };
  });

  it('omits a single property', function () {
    const val = objectOmit(obj, 'one');

    expect(val).to.eql({
      two: 2,
      three: 3,
      arr: [1,2,3],
      check: 'aw yeah',
    });
  });

  it('omits multiple properties', function () {
    const val = objectOmit(obj, ['three', 'check']);

    expect(val).to.eql({
      one: 1,
      two: 2,
      arr: [1,2,3],
    });
  });
});
