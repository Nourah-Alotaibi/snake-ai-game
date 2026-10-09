import test from 'node:test';
import assert from 'node:assert/strict';
import {Network,RNG} from '../web/core.mjs';

test('inspection reproduces every weighted sum and activation across supported architectures',()=>{
  for (const depth of [1,2,3]) for (const hidden of [8,32,64]) {
    const net=new Network([11,...Array(depth).fill(hidden),3],new RNG(83));
    const input=[1,0,1,0,1,0,0,1,0,1,0];
    const snapshot=net.inspect(input);
    for (let l=0;l<net.layers.length;l++) {
      const layer=net.layers[l];
      for (let j=0;j<layer.output;j++) {
        let z=layer.b[j];
        for (let i=0;i<layer.input;i++) z+=snapshot.activations[l][i]*layer.w[j*layer.input+i];
        assert.equal(snapshot.sums[l][j],z);
        assert.equal(snapshot.activations[l+1][j],l===net.layers.length-1?z:Math.max(0,z));
      }
    }
    assert.deepEqual(snapshot.activations.at(-1),Array.from(net.predict(input)));
    assert.equal(snapshot.preferred,snapshot.activations.at(-1).indexOf(Math.max(...snapshot.activations.at(-1))));
    const original=snapshot.weights[0].w[0];net.layers[0].w[0]+=5;
    assert.equal(snapshot.weights[0].w[0],original,'snapshot must not retain mutable weight references');
  }
});

test('inspection retains negative linear outputs, ReLU zeros, and large finite values',()=>{
  const net=new Network([2,2,3],new RNG(1));
  net.layers[0].w.set([1000000,-1000000,-2,-2]);net.layers[0].b.set([.5,-1]);
  net.layers[1].w.set([-1,0,1,0,0,1]);
  const s=net.inspect([1,0]);
  assert.equal(s.activations[1][1],0);
  assert.equal(s.activations[2][0],-1000000.5);
  assert.equal(s.preferred,1);
});
