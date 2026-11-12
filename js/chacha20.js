/* ChaCha20 core: RFC 8439 layout, 20 rounds, 32-bit words. */
(function (global) {
  "use strict";
  const MASK = 0xffffffff;
  const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];

  function read32(bytes, offset) {
    return (bytes[offset] | (bytes[offset+1] << 8) | (bytes[offset+2] << 16) | (bytes[offset+3] << 24)) >>> 0;
  }
  function write32(value) {
    return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
  }
  function hexToBytes(hex, expected, label) {
    const clean = hex.replace(/\s+/g, "").replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length !== expected * 2) {
      throw new Error(label + " must contain exactly " + (expected * 2) + " hexadecimal characters.");
    }
    return Uint8Array.from(clean.match(/.{2}/g), x => parseInt(x, 16));
  }
  function bytesToHex(bytes) {
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  }
  function bytesToText(bytes) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  function textToBytes(text) {
    return new TextEncoder().encode(text);
  }
  function rotl(v, n) {
    return ((v << n) | (v >>> (32 - n))) >>> 0;
  }
  function quarterRound(s, a, b, c, d, trace) {
    const before = [s[a], s[b], s[c], s[d]];
    s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl((s[d] ^ s[a]) >>> 0, 16);
    s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl((s[b] ^ s[c]) >>> 0, 12);
    s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl((s[d] ^ s[a]) >>> 0, 8);
    s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl((s[b] ^ s[c]) >>> 0, 7);
    if (trace) trace.push({type:"QUARTER ROUND", name:"Quarter-round: words " + [a,b,c,d].join(", "), description:"Four 32-bit words are mixed using add, XOR and rotate-left operations. The values diffuse across the state.", indices:[a,b,c,d], words:s.slice(), before});
  }
  function initialState(keyBytes, nonceBytes, counter) {
    const state = new Uint32Array(16);
    state.set(SIGMA, 0);
    for (let i=0;i<8;i++) state[4+i] = read32(keyBytes, i*4);
    state[12] = counter >>> 0;
    for (let i=0;i<3;i++) state[13+i] = read32(nonceBytes, i*4);
    return state;
  }
  function block(keyBytes, nonceBytes, counter, trace) {
    const original = initialState(keyBytes, nonceBytes, counter);
    const working = new Uint32Array(original);
    if (trace) trace.push({type:"INITIALIZE",name:"Build the 4 × 4 state",description:"The state combines four constants, eight key words, one block counter and three nonce words.",indices:Array.from({length:16},(_,i)=>i),words:Array.from(working),before:null});
    for (let round=0; round<10; round++) {
      const beforeColumn = Array.from(working);
      quarterRound(working,0,4,8,12,trace); quarterRound(working,1,5,9,13,trace);
      quarterRound(working,2,6,10,14,trace); quarterRound(working,3,7,11,15,trace);
      if (trace) trace.push({type:"COLUMN ROUND",name:"Round " + (round*2+1) + " — column round",description:"Four quarter-rounds operate down the four columns of the state matrix.",indices:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],words:Array.from(working),before:beforeColumn,round:round*2+1});
      const beforeDiagonal = Array.from(working);
      quarterRound(working,0,5,10,15,trace); quarterRound(working,1,6,11,12,trace);
      quarterRound(working,2,7,8,13,trace); quarterRound(working,3,4,9,14,trace);
      if (trace) trace.push({type:"DIAGONAL ROUND",name:"Round " + (round*2+2) + " — diagonal round",description:"The diagonals are mixed to spread each word's influence across the entire state.",indices:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],words:Array.from(working),before:beforeDiagonal,round:round*2+2});
    }
    const output = new Uint8Array(64);
    for (let i=0;i<16;i++) {
      const sum = (working[i] + original[i]) >>> 0;
      output.set(write32(sum), i*4);
    }
    if (trace) trace.push({type:"FEED-FORWARD",name:"Add the original state",description:"Each transformed word is added to its corresponding original state word modulo 2³². The result is the 64-byte keystream block.",indices:Array.from({length:16},(_,i)=>i),words:Array.from({length:16},(_,i)=>(working[i]+original[i])>>>0),before:Array.from(working)});
    return output;
  }
  function xorBytes(a,b) {
    const out = new Uint8Array(a.length);
    for (let i=0;i<a.length;i++) out[i] = a[i] ^ b[i];
    return out;
  }
  function encrypt(text, keyHex, nonceHex) {
    const key = hexToBytes(keyHex,32,"Key"), nonce = hexToBytes(nonceHex,12,"Nonce");
    const input = textToBytes(text), output = new Uint8Array(input.length), trace = [];
    let counter = 1;
    for (let offset=0; offset<input.length; offset+=64) {
      if (counter > 0xffffffff) throw new Error("Message is too long for this counter configuration.");
      const stream = block(key,nonce,counter++,trace);
      const chunk = input.subarray(offset,Math.min(offset+64,input.length));
      const encrypted = xorBytes(chunk,stream.subarray(0,chunk.length));
      output.set(encrypted,offset);
      trace.push({type:"XOR ENCRYPT",name:"Combine plaintext with keystream",description:"Each plaintext byte is XORed with the matching keystream byte. XOR is its own inverse, so the same operation decrypts it.",indices:[],words:null,before:null,byteOffset:offset,input:Array.from(chunk),stream:Array.from(stream.subarray(0,chunk.length)),output:Array.from(encrypted)});
    }
    return {bytes:output,hex:bytesToHex(output),trace,key,nonce,input};
  }
  function decrypt(cipherHex, keyHex, nonceHex) {
    const cipher = hexToBytes(cipherHex.replace(/\s/g,""), cipherHex.replace(/\s/g,"").length/2, "Ciphertext");
    const key = hexToBytes(keyHex,32,"Key"), nonce = hexToBytes(nonceHex,12,"Nonce");
    const output = new Uint8Array(cipher.length);
    let counter=1;
    for(let offset=0;offset<cipher.length;offset+=64){
      const stream=block(key,nonce,counter++);
      const chunk=cipher.subarray(offset,Math.min(offset+64,cipher.length));
      output.set(xorBytes(chunk,stream.subarray(0,chunk.length)),offset);
    }
    return {bytes:output,text:bytesToText(output)};
  }
  global.ChaCha20 = {encrypt,decrypt,hexToBytes,bytesToHex,textToBytes,bytesToText,initialState,block};
})(window);
