// Media VI v2.1. Source snapshots and credits: sources.json and vendor/.
// This wrapper never rewrites media chunks, invents audio formats, or unlocks
// server entitlements. A successful fixture test is not an iPhone playback test.
(() => {
  let completed = false;
  function finish(result = {}) {
    if (completed) return;
    completed = true;
    $done(result);
  }
  try {
    const request = typeof $request === "object" && $request ? $request : {};
    const response = typeof $response === "object" && $response ? $response : null;
    const url = String(request.url || "");
    const body = response ? response.body : request.body;
    const size = ArrayBuffer.isView(body) ? body.byteLength
      : body instanceof ArrayBuffer ? body.byteLength
      : typeof body === "string" ? body.length : 0;
    if (size > 4194304) return finish();

    const spotify = /^https:\/\/(?:[A-Za-z0-9-]+-)?spclient(?:\.wg)?\.spotify\.com(?::443)?\/([^?#]*)/.exec(url);
    if (spotify) {
      if (!response || size > 2097152) return finish();
      const path = spotify[1].replace(/\/$/, "");
      const status = Number(response.status || response.statusCode);
      const args = typeof $argument === "string" ? $argument : "Lyrics=true&Translate=true&TargetLanguage=vi";
      const lyrics = /^(?:color-lyrics\/v2\/track\/|scrollsita\/v[0-9]+\/scroll\/spotify:|metadata\/4\/track\/|connect-state\/v1\/devices\/)/.test(path)
        || path === "extended-metadata/v0/extended-metadata";
      if (lyrics) {
        if (status !== 200 && status !== 404) return finish();
        return runSpotifyLyrics(finish, args, request, response);
      }
      if (status !== 200) return finish();
      if (path === "casita/v1/home/default") return runSpotifyHome(finish, args, request, response);
      if (/^(?:bootstrap\/v1\/bootstrap|user-customization-service\/v1\/customize|nebula\/v1\/configuration\/attributes|remote-config-resolver\/v3\/configuration)$/.test(path)) {
        return runSpotifyProto(finish, args, request, response);
      }
      // Do not use the upstream search byte-scanner: normal text can resemble
      // a protobuf tag. Playback and home ad handling do not need that scanner.
      return finish();
    }

    const api = /^https:\/\/youtubei\.googleapis\.com(?::443)?\/youtubei\/v1\/(browse|next|player|search|reel\/reel_watch_sequence|guide|get_watch|log_event|config)(?:\?|$)/.test(url);
    const init = /^https:\/\/[\w-]+\.googlevideo\.com(?::443)?\/initplayback\?/.test(url);
    if (!api && !init) return finish();
    const headers = request.headers || {};
    const agentKeys = Object.keys(headers).filter(key => key.toLowerCase() === "user-agent");
    const agents = [...new Set(agentKeys.map(key => String(headers[key] || "")))];
    if (agents.length !== 1) return finish();
    const agent = agents[0];
    if (!/^com\.google\.ios\.youtube(?:music)?\//i.test(agent)) return finish();
    const safeHeaders = {};
    for (const key of Object.keys(headers)) if (key.toLowerCase() !== "user-agent") safeHeaders[key] = headers[key];
    safeHeaders["User-Agent"] = agent;
    const safeRequest = { ...request, headers: safeHeaders };
    if (!response && request.method !== "POST") return finish();
    let safeResponse = response;
    if (response) {
      if (Number(response.status || response.statusCode) !== 200 || !size) return finish();
      if (!ArrayBuffer.isView(body) && !(body instanceof ArrayBuffer)) return finish();
      safeResponse = { ...response, body: ArrayBuffer.isView(body)
        ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
        : new Uint8Array(body) };
    }
    // Music has its own narrow wire-format handler. Its Song/Video renderer,
    // stream URLs, MIME types, bitrates and subscription callbacks stay intact.
    if (/com\.google\.ios\.youtubemusic\//i.test(agent)) {
      return runYouTubeMusic(finish, "", safeRequest, safeResponse || undefined);
    }
    let options = {};
    if (typeof $argument === "string" && $argument.trim()) options = JSON.parse($argument);
    if (!options || typeof options !== "object" || Array.isArray(options)) options = {};
    const config = { captionLang: "off", blockUpload: true, blockImmersive: false, blockShorts: true, debug: false };
    for (const name of ["blockUpload", "blockImmersive", "blockShorts", "debug"]) {
      if (typeof options[name] === "boolean") config[name] = options[name];
    }
    const args = JSON.stringify(config);
    if (response && api) {
      // Upstream chooses its decoder using substring matching. Query values
      // such as ?ref=browse must never choose the decoder for another endpoint.
      return runYouTubeResponse(finish, args, { ...safeRequest, url: url.replace(/[?#].*$/, "") }, safeResponse);
    }
    if (!response && (init || /\/log_event(?:\?|$)/.test(url))) {
      return runYouTubeRequest(finish, args, safeRequest, undefined);
    }
    return finish();
  } catch (_) {
    console.log("Media VI: unexpected data left unchanged");
    finish();
  }

  function runYouTubeResponse($done, $argument, $request, $response) {
// Build: 2026/7/19 16:16:39
(()=>{var fi=Object.create;var Me=Object.defineProperty;var di=Object.getOwnPropertyDescriptor;var pi=Object.getOwnPropertyNames;var yi=Object.getPrototypeOf,hi=Object.prototype.hasOwnProperty;var mi=(l,e,t)=>e in l?Me(l,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):l[e]=t;var gi=(l,e)=>()=>(e||l((e={exports:{}}).exports,e),e.exports);var bi=(l,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of pi(e))!hi.call(l,i)&&i!==t&&Me(l,i,{get:()=>e[i],enumerable:!(n=di(e,i))||n.enumerable});return l};var g=(l,e,t)=>(t=l!=null?fi(yi(l)):{},bi(e||!l||!l.__esModule?Me(t,"default",{value:l,enumerable:!0}):t,l));var pe=(l,e,t)=>(mi(l,typeof e!="symbol"?e+"":e,t),t);var h=gi(Nr=>{"use strict";(function(l){function e(){}function t(){}var n=String.fromCharCode,i={}.toString,r=i.call(l.SharedArrayBuffer),c=i(),o=l.Uint8Array,s=o||Array,a=o?ArrayBuffer:s,u=a.isView||function(I){return I&&"length"in I},B=i.call(a.prototype);a=t.prototype;var w=l.TextEncoder,b=new(o?Uint16Array:s)(32);e.prototype.decode=function(I){if(!u(I)){var $=i.call(I);if($!==B&&$!==r&&$!==c)throw TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");I=o?new s(I):I||[]}for(var N=$="",k=0,C=I.length|0,de=C-32|0,U,S,A=0,J=0,V,j=0,M=-1;k<C;){for(U=k<=de?32:C-k|0;j<U;k=k+1|0,j=j+1|0){switch(S=I[k]&255,S>>4){case 15:if(V=I[k=k+1|0]&255,V>>6!==2||247<S){k=k-1|0;break}A=(S&7)<<6|V&63,J=5,S=256;case 14:V=I[k=k+1|0]&255,A<<=6,A|=(S&15)<<6|V&63,J=V>>6===2?J+4|0:24,S=S+256&768;case 13:case 12:V=I[k=k+1|0]&255,A<<=6,A|=(S&31)<<6|V&63,J=J+7|0,k<C&&V>>6===2&&A>>J&&1114112>A?(S=A,A=A-65536|0,0<=A&&(M=(A>>10)+55296|0,S=(A&1023)+56320|0,31>j?(b[j]=M,j=j+1|0,M=-1):(V=M,M=S,S=V))):(S>>=8,k=k-S-1|0,S=65533),A=J=0,U=k<=de?32:C-k|0;default:b[j]=S;continue;case 11:case 10:case 9:case 8:}b[j]=65533}if(N+=n(b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7],b[8],b[9],b[10],b[11],b[12],b[13],b[14],b[15],b[16],b[17],b[18],b[19],b[20],b[21],b[22],b[23],b[24],b[25],b[26],b[27],b[28],b[29],b[30],b[31]),32>j&&(N=N.slice(0,j-32|0)),k<C){if(b[0]=M,j=~M>>>31,M=-1,N.length<$.length)continue}else M!==-1&&(N+=n(M));$+=N,N=""}return $},a.encode=function(I){I=I===void 0?"":""+I;var $=I.length|0,N=new s(($<<1)+8|0),k,C=0,de=!o;for(k=0;k<$;k=k+1|0,C=C+1|0){var U=I.charCodeAt(k)|0;if(127>=U)N[C]=U;else{if(2047>=U)N[C]=192|U>>6;else{e:{if(55296<=U)if(56319>=U){var S=I.charCodeAt(k=k+1|0)|0;if(56320<=S&&57343>=S){if(U=(U<<10)+S-56613888|0,65535<U){N[C]=240|U>>18,N[C=C+1|0]=128|U>>12&63,N[C=C+1|0]=128|U>>6&63,N[C=C+1|0]=128|U&63;continue}break e}U=65533}else 57343>=U&&(U=65533);!de&&k<<1<C&&k<<1<(C-7|0)&&(de=!0,S=new s(3*$),S.set(N),N=S)}N[C]=224|U>>12,N[C=C+1|0]=128|U>>6&63}N[C=C+1|0]=128|U&63}}return o?N.subarray(0,C):N.slice(0,C)},w||(l.TextDecoder=e,l.TextEncoder=t)})(""+void 0==typeof global?""+void 0==typeof globalThis?Nr:globalThis:global)});var Wc=g(h(),1);var tc=g(h(),1);var jo=g(h());var Xi=g(h());function Be(l){let e=typeof l;if(e=="object"){if(Array.isArray(l))return"array";if(l===null)return"null"}return e}function Sr(l){return l!==null&&typeof l=="object"&&!Array.isArray(l)}var Yi=g(h()),v="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(""),Ie=[];for(let l=0;l<v.length;l++)Ie[v[l].charCodeAt(0)]=l;Ie["-".charCodeAt(0)]=v.indexOf("+");Ie["_".charCodeAt(0)]=v.indexOf("/");function Te(l){let e=l.length*3/4;l[l.length-2]=="="?e-=2:l[l.length-1]=="="&&(e-=1);let t=new Uint8Array(e),n=0,i=0,r,c=0;for(let o=0;o<l.length;o++){if(r=Ie[l.charCodeAt(o)],r===void 0)switch(l[o]){case"=":i=0;case`
`:case"\r":case"	":case" ":continue;default:throw Error("invalid base64 string.")}switch(i){case 0:c=r,i=1;break;case 1:t[n++]=c<<2|(r&48)>>4,c=r,i=2;break;case 2:t[n++]=(c&15)<<4|(r&60)>>2,c=r,i=3;break;case 3:t[n++]=(c&3)<<6|r,i=0;break}}if(i==1)throw Error("invalid base64 string.");return t.subarray(0,n)}function Q(l){let e="",t=0,n,i=0;for(let r=0;r<l.length;r++)switch(n=l[r],t){case 0:e+=v[n>>2],i=(n&3)<<4,t=1;break;case 1:e+=v[i|n>>4],i=(n&15)<<2,t=2;break;case 2:e+=v[i|n>>6],e+=v[n&63],t=0;break}return t&&(e+=v[i],e+="=",t==1&&(e+="=")),e}var Zi=g(h()),d;(function(l){l.symbol=Symbol.for("protobuf-ts/unknown"),l.onRead=(t,n,i,r,c)=>{(e(n)?n[l.symbol]:n[l.symbol]=[]).push({no:i,wireType:r,data:c})},l.onWrite=(t,n,i)=>{for(let{no:r,wireType:c,data:o}of l.list(n))i.tag(r,c).raw(o)},l.list=(t,n)=>{if(e(t)){let i=t[l.symbol];return n?i.filter(r=>r.no==n):i}return[]},l.last=(t,n)=>l.list(t,n).slice(-1)[0];let e=t=>t&&Array.isArray(t[l.symbol])})(d||(d={}));var f;(function(l){l[l.Varint=0]="Varint",l[l.Bit64=1]="Bit64",l[l.LengthDelimited=2]="LengthDelimited",l[l.StartGroup=3]="StartGroup",l[l.EndGroup=4]="EndGroup",l[l.Bit32=5]="Bit32"})(f||(f={}));var la=g(h());var ra=g(h());var ea=g(h());function Or(){let l=0,e=0;for(let n=0;n<28;n+=7){let i=this.buf[this.pos++];if(l|=(i&127)<<n,!(i&128))return this.assertBounds(),[l,e]}let t=this.buf[this.pos++];if(l|=(t&15)<<28,e=(t&112)>>4,!(t&128))return this.assertBounds(),[l,e];for(let n=3;n<=31;n+=7){let i=this.buf[this.pos++];if(e|=(i&127)<<n,!(i&128))return this.assertBounds(),[l,e]}throw new Error("invalid varint")}function xe(l,e,t){for(let r=0;r<28;r=r+7){let c=l>>>r,o=!(!(c>>>7)&&e==0),s=(o?c|128:c)&255;if(t.push(s),!o)return}let n=l>>>28&15|(e&7)<<4,i=!!(e>>3);if(t.push((i?n|128:n)&255),!!i){for(let r=3;r<31;r=r+7){let c=e>>>r,o=!!(c>>>7),s=(o?c|128:c)&255;if(t.push(s),!o)return}t.push(e>>>31&1)}}var Ce=(1<<16)*(1<<16);function ve(l){let e=l[0]=="-";e&&(l=l.slice(1));let t=1e6,n=0,i=0;function r(c,o){let s=Number(l.slice(c,o));i*=t,n=n*t+s,n>=Ce&&(i=i+(n/Ce|0),n=n%Ce)}return r(-24,-18),r(-18,-12),r(-12,-6),r(-6),[e,n,i]}function We(l,e){if(e>>>0<=2097151)return""+(Ce*e+(l>>>0));let t=l&16777215,n=(l>>>24|e<<8)>>>0&16777215,i=e>>16&65535,r=t+n*6777216+i*6710656,c=n+i*8147497,o=i*2,s=1e7;r>=s&&(c+=Math.floor(r/s),r%=s),c>=s&&(o+=Math.floor(c/s),c%=s);function a(u,B){let w=u?String(u):"";return B?"0000000".slice(w.length)+w:w}return a(o,0)+a(c,o)+a(r,1)}function Ge(l,e){if(l>=0){for(;l>127;)e.push(l&127|128),l=l>>>7;e.push(l)}else{for(let t=0;t<9;t++)e.push(l&127|128),l=l>>7;e.push(1)}}function Pr(){let l=this.buf[this.pos++],e=l&127;if(!(l&128))return this.assertBounds(),e;if(l=this.buf[this.pos++],e|=(l&127)<<7,!(l&128))return this.assertBounds(),e;if(l=this.buf[this.pos++],e|=(l&127)<<14,!(l&128))return this.assertBounds(),e;if(l=this.buf[this.pos++],e|=(l&127)<<21,!(l&128))return this.assertBounds(),e;l=this.buf[this.pos++],e|=(l&15)<<28;for(let t=5;l&128&&t<10;t++)l=this.buf[this.pos++];if(l&128)throw new Error("invalid varint");return this.assertBounds(),e>>>0}var x;function ki(){let l=new DataView(new ArrayBuffer(8));x=globalThis.BigInt!==void 0&&typeof l.getBigInt64=="function"&&typeof l.getBigUint64=="function"&&typeof l.setBigInt64=="function"&&typeof l.setBigUint64=="function"?{MIN:BigInt("-9223372036854775808"),MAX:BigInt("9223372036854775807"),UMIN:BigInt("0"),UMAX:BigInt("18446744073709551615"),C:BigInt,V:l}:void 0}ki();function Ur(l){if(!l)throw new Error("BigInt unavailable, see https://github.com/timostamm/protobuf-ts/blob/v1.0.8/MANUAL.md#bigint-support")}var Er=/^-?[0-9]+$/,Se=4294967296,Ne=2147483648,Oe=class{constructor(e,t){this.lo=e|0,this.hi=t|0}isZero(){return this.lo==0&&this.hi==0}toNumber(){let e=this.hi*Se+(this.lo>>>0);if(!Number.isSafeInteger(e))throw new Error("cannot convert to safe number");return e}},O=class extends Oe{static from(e){if(x)switch(typeof e){case"string":if(e=="0")return this.ZERO;if(e=="")throw new Error("string is no integer");e=x.C(e);case"number":if(e===0)return this.ZERO;e=x.C(e);case"bigint":if(!e)return this.ZERO;if(e<x.UMIN)throw new Error("signed value for ulong");if(e>x.UMAX)throw new Error("ulong too large");return x.V.setBigUint64(0,e,!0),new O(x.V.getInt32(0,!0),x.V.getInt32(4,!0))}else switch(typeof e){case"string":if(e=="0")return this.ZERO;if(e=e.trim(),!Er.test(e))throw new Error("string is no integer");let[t,n,i]=ve(e);if(t)throw new Error("signed value for ulong");return new O(n,i);case"number":if(e==0)return this.ZERO;if(!Number.isSafeInteger(e))throw new Error("number is no integer");if(e<0)throw new Error("signed value for ulong");return new O(e,e/Se)}throw new Error("unknown value "+typeof e)}toString(){return x?this.toBigInt().toString():We(this.lo,this.hi)}toBigInt(){return Ur(x),x.V.setInt32(0,this.lo,!0),x.V.setInt32(4,this.hi,!0),x.V.getBigUint64(0,!0)}};O.ZERO=new O(0,0);var T=class extends Oe{static from(e){if(x)switch(typeof e){case"string":if(e=="0")return this.ZERO;if(e=="")throw new Error("string is no integer");e=x.C(e);case"number":if(e===0)return this.ZERO;e=x.C(e);case"bigint":if(!e)return this.ZERO;if(e<x.MIN)throw new Error("signed long too small");if(e>x.MAX)throw new Error("signed long too large");return x.V.setBigInt64(0,e,!0),new T(x.V.getInt32(0,!0),x.V.getInt32(4,!0))}else switch(typeof e){case"string":if(e=="0")return this.ZERO;if(e=e.trim(),!Er.test(e))throw new Error("string is no integer");let[t,n,i]=ve(e);if(t){if(i>Ne||i==Ne&&n!=0)throw new Error("signed long too small")}else if(i>=Ne)throw new Error("signed long too large");let r=new T(n,i);return t?r.negate():r;case"number":if(e==0)return this.ZERO;if(!Number.isSafeInteger(e))throw new Error("number is no integer");return e>0?new T(e,e/Se):new T(-e,-e/Se).negate()}throw new Error("unknown value "+typeof e)}isNegative(){return(this.hi&Ne)!==0}negate(){let e=~this.hi,t=this.lo;return t?t=~t+1:e+=1,new T(t,e)}toString(){if(x)return this.toBigInt().toString();if(this.isNegative()){let e=this.negate();return"-"+We(e.lo,e.hi)}return We(this.lo,this.hi)}toBigInt(){return Ur(x),x.V.setInt32(0,this.lo,!0),x.V.setInt32(4,this.hi,!0),x.V.getBigInt64(0,!0)}};T.ZERO=new T(0,0);var Fr={readUnknownField:!0,readerFactory:l=>new Ke(l)};function Lr(l){return l?Object.assign(Object.assign({},Fr),l):Fr}var Ke=class{constructor(e,t){this.varint64=Or,this.uint32=Pr,this.buf=e,this.len=e.length,this.pos=0,this.view=new DataView(e.buffer,e.byteOffset,e.byteLength),this.textDecoder=t??new TextDecoder("utf-8",{fatal:!0,ignoreBOM:!0})}tag(){let e=this.uint32(),t=e>>>3,n=e&7;if(t<=0||n<0||n>5)throw new Error("illegal tag: field no "+t+" wire type "+n);return[t,n]}skip(e){let t=this.pos;switch(e){case f.Varint:for(;this.buf[this.pos++]&128;);break;case f.Bit64:this.pos+=4;case f.Bit32:this.pos+=4;break;case f.LengthDelimited:let n=this.uint32();this.pos+=n;break;case f.StartGroup:let i;for(;(i=this.tag()[1])!==f.EndGroup;)this.skip(i);break;default:throw new Error("cant skip wire type "+e)}return this.assertBounds(),this.buf.subarray(t,this.pos)}assertBounds(){if(this.pos>this.len)throw new RangeError("premature EOF")}int32(){return this.uint32()|0}sint32(){let e=this.uint32();return e>>>1^-(e&1)}int64(){return new T(...this.varint64())}uint64(){return new O(...this.varint64())}sint64(){let[e,t]=this.varint64(),n=-(e&1);return e=(e>>>1|(t&1)<<31)^n,t=t>>>1^n,new T(e,t)}bool(){let[e,t]=this.varint64();return e!==0||t!==0}fixed32(){return this.view.getUint32((this.pos+=4)-4,!0)}sfixed32(){return this.view.getInt32((this.pos+=4)-4,!0)}fixed64(){return new O(this.sfixed32(),this.sfixed32())}sfixed64(){return new T(this.sfixed32(),this.sfixed32())}float(){return this.view.getFloat32((this.pos+=4)-4,!0)}double(){return this.view.getFloat64((this.pos+=8)-8,!0)}bytes(){let e=this.uint32(),t=this.pos;return this.pos+=e,this.assertBounds(),this.buf.subarray(t,t+e)}string(){return this.textDecoder.decode(this.bytes())}};var ha=g(h());var ua=g(h());function R(l,e){if(!l)throw new Error(e)}var Ri=34028234663852886e22,wi=-34028234663852886e22,Bi=4294967295,Ii=2147483647,Ti=-2147483648;function H(l){if(typeof l!="number")throw new Error("invalid int 32: "+typeof l);if(!Number.isInteger(l)||l>Ii||l<Ti)throw new Error("invalid int 32: "+l)}function X(l){if(typeof l!="number")throw new Error("invalid uint 32: "+typeof l);if(!Number.isInteger(l)||l>Bi||l<0)throw new Error("invalid uint 32: "+l)}function ee(l){if(typeof l!="number")throw new Error("invalid float 32: "+typeof l);if(Number.isFinite(l)&&(l>Ri||l<wi))throw new Error("invalid float 32: "+l)}var Ar={writeUnknownFields:!0,writerFactory:()=>new He};function Dr(l){return l?Object.assign(Object.assign({},Ar),l):Ar}var He=class{constructor(e){this.stack=[],this.textEncoder=e??new TextEncoder,this.chunks=[],this.buf=[]}finish(){this.chunks.push(new Uint8Array(this.buf));let e=0;for(let i=0;i<this.chunks.length;i++)e+=this.chunks[i].length;let t=new Uint8Array(e),n=0;for(let i=0;i<this.chunks.length;i++)t.set(this.chunks[i],n),n+=this.chunks[i].length;return this.chunks=[],t}fork(){return this.stack.push({chunks:this.chunks,buf:this.buf}),this.chunks=[],this.buf=[],this}join(){let e=this.finish(),t=this.stack.pop();if(!t)throw new Error("invalid state, fork stack empty");return this.chunks=t.chunks,this.buf=t.buf,this.uint32(e.byteLength),this.raw(e)}tag(e,t){return this.uint32((e<<3|t)>>>0)}raw(e){return this.buf.length&&(this.chunks.push(new Uint8Array(this.buf)),this.buf=[]),this.chunks.push(e),this}uint32(e){for(X(e);e>127;)this.buf.push(e&127|128),e=e>>>7;return this.buf.push(e),this}int32(e){return H(e),Ge(e,this.buf),this}bool(e){return this.buf.push(e?1:0),this}bytes(e){return this.uint32(e.byteLength),this.raw(e)}string(e){let t=this.textEncoder.encode(e);return this.uint32(t.byteLength),this.raw(t)}float(e){ee(e);let t=new Uint8Array(4);return new DataView(t.buffer).setFloat32(0,e,!0),this.raw(t)}double(e){let t=new Uint8Array(8);return new DataView(t.buffer).setFloat64(0,e,!0),this.raw(t)}fixed32(e){X(e);let t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e,!0),this.raw(t)}sfixed32(e){H(e);let t=new Uint8Array(4);return new DataView(t.buffer).setInt32(0,e,!0),this.raw(t)}sint32(e){return H(e),e=(e<<1^e>>31)>>>0,Ge(e,this.buf),this}sfixed64(e){let t=new Uint8Array(8),n=new DataView(t.buffer),i=T.from(e);return n.setInt32(0,i.lo,!0),n.setInt32(4,i.hi,!0),this.raw(t)}fixed64(e){let t=new Uint8Array(8),n=new DataView(t.buffer),i=O.from(e);return n.setInt32(0,i.lo,!0),n.setInt32(4,i.hi,!0),this.raw(t)}int64(e){let t=T.from(e);return xe(t.lo,t.hi,this.buf),this}sint64(e){let t=T.from(e),n=t.hi>>31,i=t.lo<<1^n,r=(t.hi<<1|t.lo>>>31)^n;return xe(i,r,this.buf),this}uint64(e){let t=O.from(e);return xe(t.lo,t.hi,this.buf),this}};var ga=g(h()),$r={emitDefaultValues:!1,enumAsInteger:!1,useProtoFieldName:!1,prettySpaces:0},jr={ignoreUnknownFields:!1};function Vr(l){return l?Object.assign(Object.assign({},jr),l):jr}function Mr(l){return l?Object.assign(Object.assign({},$r),l):$r}var ka=g(h()),Pe=Symbol.for("protobuf-ts/message-type");var Ao=g(h());var Ta=g(h());var wa=g(h());function _e(l){let e=!1,t=[];for(let n=0;n<l.length;n++){let i=l.charAt(n);i=="_"?e=!0:/\d/.test(i)?(t.push(i),e=!0):e?(t.push(i.toUpperCase()),e=!1):n==0?t.push(i.toLowerCase()):t.push(i)}return t.join("")}var p;(function(l){l[l.DOUBLE=1]="DOUBLE",l[l.FLOAT=2]="FLOAT",l[l.INT64=3]="INT64",l[l.UINT64=4]="UINT64",l[l.INT32=5]="INT32",l[l.FIXED64=6]="FIXED64",l[l.FIXED32=7]="FIXED32",l[l.BOOL=8]="BOOL",l[l.STRING=9]="STRING",l[l.BYTES=12]="BYTES",l[l.UINT32=13]="UINT32",l[l.SFIXED32=15]="SFIXED32",l[l.SFIXED64=16]="SFIXED64",l[l.SINT32=17]="SINT32",l[l.SINT64=18]="SINT64"})(p||(p={}));var L;(function(l){l[l.BIGINT=0]="BIGINT",l[l.STRING=1]="STRING",l[l.NUMBER=2]="NUMBER"})(L||(L={}));var ye;(function(l){l[l.NO=0]="NO",l[l.PACKED=1]="PACKED",l[l.UNPACKED=2]="UNPACKED"})(ye||(ye={}));function vr(l){var e,t,n,i;return l.localName=(e=l.localName)!==null&&e!==void 0?e:_e(l.name),l.jsonName=(t=l.jsonName)!==null&&t!==void 0?t:_e(l.name),l.repeat=(n=l.repeat)!==null&&n!==void 0?n:ye.NO,l.opt=(i=l.opt)!==null&&i!==void 0?i:l.repeat||l.oneof?!1:l.kind=="message",l}var Oa=g(h());var xa=g(h());function Gr(l){if(typeof l!="object"||l===null||!l.hasOwnProperty("oneofKind"))return!1;switch(typeof l.oneofKind){case"string":return l[l.oneofKind]===void 0?!1:Object.keys(l).length==2;case"undefined":return Object.keys(l).length==1;default:return!1}}var Ue=class{constructor(e){var t;this.fields=(t=e.fields)!==null&&t!==void 0?t:[]}prepare(){if(this.data)return;let e=[],t=[],n=[];for(let i of this.fields)if(i.oneof)n.includes(i.oneof)||(n.push(i.oneof),e.push(i.oneof),t.push(i.oneof));else switch(t.push(i.localName),i.kind){case"scalar":case"enum":(!i.opt||i.repeat)&&e.push(i.localName);break;case"message":i.repeat&&e.push(i.localName);break;case"map":e.push(i.localName);break}this.data={req:e,known:t,oneofs:Object.values(n)}}is(e,t,n=!1){if(t<0)return!0;if(e==null||typeof e!="object")return!1;this.prepare();let i=Object.keys(e),r=this.data;if(i.length<r.req.length||r.req.some(c=>!i.includes(c))||!n&&i.some(c=>!r.known.includes(c)))return!1;if(t<1)return!0;for(let c of r.oneofs){let o=e[c];if(!Gr(o))return!1;if(o.oneofKind===void 0)continue;let s=this.fields.find(a=>a.localName===o.oneofKind);if(!s||!this.field(o[o.oneofKind],s,n,t))return!1}for(let c of this.fields)if(c.oneof===void 0&&!this.field(e[c.localName],c,n,t))return!1;return!0}field(e,t,n,i){let r=t.repeat;switch(t.kind){case"scalar":return e===void 0?t.opt:r?this.scalars(e,t.T,i,t.L):this.scalar(e,t.T,t.L);case"enum":return e===void 0?t.opt:r?this.scalars(e,p.INT32,i):this.scalar(e,p.INT32);case"message":return e===void 0?!0:r?this.messages(e,t.T(),n,i):this.message(e,t.T(),n,i);case"map":if(typeof e!="object"||e===null)return!1;if(i<2)return!0;if(!this.mapKeys(e,t.K,i))return!1;switch(t.V.kind){case"scalar":return this.scalars(Object.values(e),t.V.T,i,t.V.L);case"enum":return this.scalars(Object.values(e),p.INT32,i);case"message":return this.messages(Object.values(e),t.V.T(),n,i)}break}return!0}message(e,t,n,i){return n?t.isAssignable(e,i):t.is(e,i)}messages(e,t,n,i){if(!Array.isArray(e))return!1;if(i<2)return!0;if(n){for(let r=0;r<e.length&&r<i;r++)if(!t.isAssignable(e[r],i-1))return!1}else for(let r=0;r<e.length&&r<i;r++)if(!t.is(e[r],i-1))return!1;return!0}scalar(e,t,n){let i=typeof e;switch(t){case p.UINT64:case p.FIXED64:case p.INT64:case p.SFIXED64:case p.SINT64:switch(n){case L.BIGINT:return i=="bigint";case L.NUMBER:return i=="number"&&!isNaN(e);default:return i=="string"}case p.BOOL:return i=="boolean";case p.STRING:return i=="string";case p.BYTES:return e instanceof Uint8Array;case p.DOUBLE:case p.FLOAT:return i=="number"&&!isNaN(e);default:return i=="number"&&Number.isInteger(e)}}scalars(e,t,n,i){if(!Array.isArray(e))return!1;if(n<2)return!0;if(Array.isArray(e)){for(let r=0;r<e.length&&r<n;r++)if(!this.scalar(e[r],t,i))return!1}return!0}mapKeys(e,t,n){let i=Object.keys(e);switch(t){case p.INT32:case p.FIXED32:case p.SFIXED32:case p.SINT32:case p.UINT32:return this.scalars(i.slice(0,n).map(r=>parseInt(r)),t,n);case p.BOOL:return this.scalars(i.slice(0,n).map(r=>r=="true"?!0:r=="false"?!1:r),t,n);default:return this.scalars(i,t,n,L.STRING)}}};var Ma=g(h());var Ea=g(h());function D(l,e){switch(e){case L.BIGINT:return l.toBigInt();case L.NUMBER:return l.toNumber();default:return l.toString()}}var Ee=class{constructor(e){this.info=e}prepare(){var e;if(this.fMap===void 0){this.fMap={};let t=(e=this.info.fields)!==null&&e!==void 0?e:[];for(let n of t)this.fMap[n.name]=n,this.fMap[n.jsonName]=n,this.fMap[n.localName]=n}}assert(e,t,n){if(!e){let i=Be(n);throw(i=="number"||i=="boolean")&&(i=n.toString()),new Error(`Cannot parse JSON ${i} for ${this.info.typeName}#${t}`)}}read(e,t,n){this.prepare();let i=[];for(let[r,c]of Object.entries(e)){let o=this.fMap[r];if(!o){if(!n.ignoreUnknownFields)throw new Error(`Found unknown field while reading ${this.info.typeName} from JSON format. JSON key: ${r}`);continue}let s=o.localName,a;if(o.oneof){if(c===null&&(o.kind!=="enum"||o.T()[0]!=="google.protobuf.NullValue"))continue;if(i.includes(o.oneof))throw new Error(`Multiple members of the oneof group "${o.oneof}" of ${this.info.typeName} are present in JSON.`);i.push(o.oneof),a=t[o.oneof]={oneofKind:s}}else a=t;if(o.kind=="map"){if(c===null)continue;this.assert(Sr(c),o.name,c);let u=a[s];for(let[B,w]of Object.entries(c)){this.assert(w!==null,o.name+" map value",null);let b;switch(o.V.kind){case"message":b=o.V.T().internalJsonRead(w,n);break;case"enum":if(b=this.enum(o.V.T(),w,o.name,n.ignoreUnknownFields),b===!1)continue;break;case"scalar":b=this.scalar(w,o.V.T,o.V.L,o.name);break}this.assert(b!==void 0,o.name+" map value",w);let I=B;o.K==p.BOOL&&(I=I=="true"?!0:I=="false"?!1:I),I=this.scalar(I,o.K,L.STRING,o.name).toString(),u[I]=b}}else if(o.repeat){if(c===null)continue;this.assert(Array.isArray(c),o.name,c);let u=a[s];for(let B of c){this.assert(B!==null,o.name,null);let w;switch(o.kind){case"message":w=o.T().internalJsonRead(B,n);break;case"enum":if(w=this.enum(o.T(),B,o.name,n.ignoreUnknownFields),w===!1)continue;break;case"scalar":w=this.scalar(B,o.T,o.L,o.name);break}this.assert(w!==void 0,o.name,c),u.push(w)}}else switch(o.kind){case"message":if(c===null&&o.T().typeName!="google.protobuf.Value"){this.assert(o.oneof===void 0,o.name+" (oneof member)",null);continue}a[s]=o.T().internalJsonRead(c,n,a[s]);break;case"enum":let u=this.enum(o.T(),c,o.name,n.ignoreUnknownFields);if(u===!1)continue;a[s]=u;break;case"scalar":a[s]=this.scalar(c,o.T,o.L,o.name);break}}}enum(e,t,n,i){if(e[0]=="google.protobuf.NullValue"&&R(t===null||t==="NULL_VALUE",`Unable to parse field ${this.info.typeName}#${n}, enum ${e[0]} only accepts null.`),t===null)return 0;switch(typeof t){case"number":return R(Number.isInteger(t),`Unable to parse field ${this.info.typeName}#${n}, enum can only be integral number, got ${t}.`),t;case"string":let r=t;e[2]&&t.substring(0,e[2].length)===e[2]&&(r=t.substring(e[2].length));let c=e[1][r];return typeof c>"u"&&i?!1:(R(typeof c=="number",`Unable to parse field ${this.info.typeName}#${n}, enum ${e[0]} has no value for "${t}".`),c)}R(!1,`Unable to parse field ${this.info.typeName}#${n}, cannot parse enum value from ${typeof t}".`)}scalar(e,t,n,i){let r;try{switch(t){case p.DOUBLE:case p.FLOAT:if(e===null)return 0;if(e==="NaN")return Number.NaN;if(e==="Infinity")return Number.POSITIVE_INFINITY;if(e==="-Infinity")return Number.NEGATIVE_INFINITY;if(e===""){r="empty string";break}if(typeof e=="string"&&e.trim().length!==e.length){r="extra whitespace";break}if(typeof e!="string"&&typeof e!="number")break;let c=Number(e);if(Number.isNaN(c)){r="not a number";break}if(!Number.isFinite(c)){r="too large or small";break}return t==p.FLOAT&&ee(c),c;case p.INT32:case p.FIXED32:case p.SFIXED32:case p.SINT32:case p.UINT32:if(e===null)return 0;let o;if(typeof e=="number"?o=e:e===""?r="empty string":typeof e=="string"&&(e.trim().length!==e.length?r="extra whitespace":o=Number(e)),o===void 0)break;return t==p.UINT32?X(o):H(o),o;case p.INT64:case p.SFIXED64:case p.SINT64:if(e===null)return D(T.ZERO,n);if(typeof e!="number"&&typeof e!="string")break;return D(T.from(e),n);case p.FIXED64:case p.UINT64:if(e===null)return D(O.ZERO,n);if(typeof e!="number"&&typeof e!="string")break;return D(O.from(e),n);case p.BOOL:if(e===null)return!1;if(typeof e!="boolean")break;return e;case p.STRING:if(e===null)return"";if(typeof e!="string"){r="extra whitespace";break}try{encodeURIComponent(e)}catch(s){s="invalid UTF8";break}return e;case p.BYTES:if(e===null||e==="")return new Uint8Array(0);if(typeof e!="string")break;return Te(e)}}catch(c){r=c.message}this.assert(!1,i+(r?" - "+r:""),e)}};var Ja=g(h());var Fe=class{constructor(e){var t;this.fields=(t=e.fields)!==null&&t!==void 0?t:[]}write(e,t){let n={},i=e;for(let r of this.fields){if(!r.oneof){let a=this.field(r,i[r.localName],t);a!==void 0&&(n[t.useProtoFieldName?r.name:r.jsonName]=a);continue}let c=i[r.oneof];if(c.oneofKind!==r.localName)continue;let o=r.kind=="scalar"||r.kind=="enum"?Object.assign(Object.assign({},t),{emitDefaultValues:!0}):t,s=this.field(r,c[r.localName],o);R(s!==void 0),n[t.useProtoFieldName?r.name:r.jsonName]=s}return n}field(e,t,n){let i;if(e.kind=="map"){R(typeof t=="object"&&t!==null);let r={};switch(e.V.kind){case"scalar":for(let[s,a]of Object.entries(t)){let u=this.scalar(e.V.T,a,e.name,!1,!0);R(u!==void 0),r[s.toString()]=u}break;case"message":let c=e.V.T();for(let[s,a]of Object.entries(t)){let u=this.message(c,a,e.name,n);R(u!==void 0),r[s.toString()]=u}break;case"enum":let o=e.V.T();for(let[s,a]of Object.entries(t)){R(a===void 0||typeof a=="number");let u=this.enum(o,a,e.name,!1,!0,n.enumAsInteger);R(u!==void 0),r[s.toString()]=u}break}(n.emitDefaultValues||Object.keys(r).length>0)&&(i=r)}else if(e.repeat){R(Array.isArray(t));let r=[];switch(e.kind){case"scalar":for(let s=0;s<t.length;s++){let a=this.scalar(e.T,t[s],e.name,e.opt,!0);R(a!==void 0),r.push(a)}break;case"enum":let c=e.T();for(let s=0;s<t.length;s++){R(t[s]===void 0||typeof t[s]=="number");let a=this.enum(c,t[s],e.name,e.opt,!0,n.enumAsInteger);R(a!==void 0),r.push(a)}break;case"message":let o=e.T();for(let s=0;s<t.length;s++){let a=this.message(o,t[s],e.name,n);R(a!==void 0),r.push(a)}break}(n.emitDefaultValues||r.length>0||n.emitDefaultValues)&&(i=r)}else switch(e.kind){case"scalar":i=this.scalar(e.T,t,e.name,e.opt,n.emitDefaultValues);break;case"enum":i=this.enum(e.T(),t,e.name,e.opt,n.emitDefaultValues,n.enumAsInteger);break;case"message":i=this.message(e.T(),t,e.name,n);break}return i}enum(e,t,n,i,r,c){if(e[0]=="google.protobuf.NullValue")return!r&&!i?void 0:null;if(t===void 0){R(i);return}if(!(t===0&&!r&&!i))return R(typeof t=="number"),R(Number.isInteger(t)),c||!e[1].hasOwnProperty(t)?t:e[2]?e[2]+e[1][t]:e[1][t]}message(e,t,n,i){return t===void 0?i.emitDefaultValues?null:void 0:e.internalJsonWrite(t,i)}scalar(e,t,n,i,r){if(t===void 0){R(i);return}let c=r||i;switch(e){case p.INT32:case p.SFIXED32:case p.SINT32:return t===0?c?0:void 0:(H(t),t);case p.FIXED32:case p.UINT32:return t===0?c?0:void 0:(X(t),t);case p.FLOAT:ee(t);case p.DOUBLE:return t===0?c?0:void 0:(R(typeof t=="number"),Number.isNaN(t)?"NaN":t===Number.POSITIVE_INFINITY?"Infinity":t===Number.NEGATIVE_INFINITY?"-Infinity":t);case p.STRING:return t===""?c?"":void 0:(R(typeof t=="string"),t);case p.BOOL:return t===!1?c?!1:void 0:(R(typeof t=="boolean"),t);case p.UINT64:case p.FIXED64:R(typeof t=="number"||typeof t=="string"||typeof t=="bigint");let o=O.from(t);return o.isZero()&&!c?void 0:o.toString();case p.INT64:case p.SFIXED64:case p.SINT64:R(typeof t=="number"||typeof t=="string"||typeof t=="bigint");let s=T.from(t);return s.isZero()&&!c?void 0:s.toString();case p.BYTES:return R(t instanceof Uint8Array),t.byteLength?Q(t):c?"":void 0}}};var io=g(h());var Za=g(h());function he(l,e=L.STRING){switch(l){case p.BOOL:return!1;case p.UINT64:case p.FIXED64:return D(O.ZERO,e);case p.INT64:case p.SFIXED64:case p.SINT64:return D(T.ZERO,e);case p.DOUBLE:case p.FLOAT:return 0;case p.BYTES:return new Uint8Array(0);case p.STRING:return"";default:return 0}}var Le=class{constructor(e){this.info=e}prepare(){var e;if(!this.fieldNoToField){let t=(e=this.info.fields)!==null&&e!==void 0?e:[];this.fieldNoToField=new Map(t.map(n=>[n.no,n]))}}read(e,t,n,i){this.prepare();let r=i===void 0?e.len:e.pos+i;for(;e.pos<r;){let[c,o]=e.tag(),s=this.fieldNoToField.get(c);if(!s){let w=n.readUnknownField;if(w=="throw")throw new Error(`Unknown field ${c} (wire type ${o}) for ${this.info.typeName}`);let b=e.skip(o);w!==!1&&(w===!0?d.onRead:w)(this.info.typeName,t,c,o,b);continue}let a=t,u=s.repeat,B=s.localName;switch(s.oneof&&(a=a[s.oneof],a.oneofKind!==B&&(a=t[s.oneof]={oneofKind:B})),s.kind){case"scalar":case"enum":let w=s.kind=="enum"?p.INT32:s.T,b=s.kind=="scalar"?s.L:void 0;if(u){let N=a[B];if(o==f.LengthDelimited&&w!=p.STRING&&w!=p.BYTES){let k=e.uint32()+e.pos;for(;e.pos<k;)N.push(this.scalar(e,w,b))}else N.push(this.scalar(e,w,b))}else a[B]=this.scalar(e,w,b);break;case"message":if(u){let N=a[B],k=s.T().internalBinaryRead(e,e.uint32(),n);N.push(k)}else a[B]=s.T().internalBinaryRead(e,e.uint32(),n,a[B]);break;case"map":let[I,$]=this.mapEntry(s,e,n);a[B][I]=$;break}}}mapEntry(e,t,n){let i=t.uint32(),r=t.pos+i,c,o;for(;t.pos<r;){let[s,a]=t.tag();switch(s){case 1:e.K==p.BOOL?c=t.bool().toString():c=this.scalar(t,e.K,L.STRING);break;case 2:switch(e.V.kind){case"scalar":o=this.scalar(t,e.V.T,e.V.L);break;case"enum":o=t.int32();break;case"message":o=e.V.T().internalBinaryRead(t,t.uint32(),n);break}break;default:throw new Error(`Unknown field ${s} (wire type ${a}) in map entry for ${this.info.typeName}#${e.name}`)}}if(c===void 0){let s=he(e.K);c=e.K==p.BOOL?s.toString():s}if(o===void 0)switch(e.V.kind){case"scalar":o=he(e.V.T,e.V.L);break;case"enum":o=0;break;case"message":o=e.V.T().create();break}return[c,o]}scalar(e,t,n){switch(t){case p.INT32:return e.int32();case p.STRING:return e.string();case p.BOOL:return e.bool();case p.DOUBLE:return e.double();case p.FLOAT:return e.float();case p.INT64:return D(e.int64(),n);case p.UINT64:return D(e.uint64(),n);case p.FIXED64:return D(e.fixed64(),n);case p.FIXED32:return e.fixed32();case p.BYTES:return e.bytes();case p.UINT32:return e.uint32();case p.SFIXED32:return e.sfixed32();case p.SFIXED64:return D(e.sfixed64(),n);case p.SINT32:return e.sint32();case p.SINT64:return D(e.sint64(),n)}}};var uo=g(h());var Ae=class{constructor(e){this.info=e}prepare(){if(!this.fields){let e=this.info.fields?this.info.fields.concat():[];this.fields=e.sort((t,n)=>t.no-n.no)}}write(e,t,n){this.prepare();for(let r of this.fields){let c,o,s=r.repeat,a=r.localName;if(r.oneof){let u=e[r.oneof];if(u.oneofKind!==a)continue;c=u[a],o=!0}else c=e[a],o=!1;switch(r.kind){case"scalar":case"enum":let u=r.kind=="enum"?p.INT32:r.T;if(s)if(R(Array.isArray(c)),s==ye.PACKED)this.packed(t,u,r.no,c);else for(let B of c)this.scalar(t,u,r.no,B,!0);else c===void 0?R(r.opt):this.scalar(t,u,r.no,c,o||r.opt);break;case"message":if(s){R(Array.isArray(c));for(let B of c)this.message(t,n,r.T(),r.no,B)}else this.message(t,n,r.T(),r.no,c);break;case"map":R(typeof c=="object"&&c!==null);for(let[B,w]of Object.entries(c))this.mapEntry(t,n,r,B,w);break}}let i=n.writeUnknownFields;i!==!1&&(i===!0?d.onWrite:i)(this.info.typeName,e,t)}mapEntry(e,t,n,i,r){e.tag(n.no,f.LengthDelimited),e.fork();let c=i;switch(n.K){case p.INT32:case p.FIXED32:case p.UINT32:case p.SFIXED32:case p.SINT32:c=Number.parseInt(i);break;case p.BOOL:R(i=="true"||i=="false"),c=i=="true";break}switch(this.scalar(e,n.K,1,c,!0),n.V.kind){case"scalar":this.scalar(e,n.V.T,2,r,!0);break;case"enum":this.scalar(e,p.INT32,2,r,!0);break;case"message":this.message(e,t,n.V.T(),2,r);break}e.join()}message(e,t,n,i,r){r!==void 0&&(n.internalBinaryWrite(r,e.tag(i,f.LengthDelimited).fork(),t),e.join())}scalar(e,t,n,i,r){let[c,o,s]=this.scalarInfo(t,i);(!s||r)&&(e.tag(n,c),e[o](i))}packed(e,t,n,i){if(!i.length)return;R(t!==p.BYTES&&t!==p.STRING),e.tag(n,f.LengthDelimited),e.fork();let[,r]=this.scalarInfo(t);for(let c=0;c<i.length;c++)e[r](i[c]);e.join()}scalarInfo(e,t){let n=f.Varint,i,r=t===void 0,c=t===0;switch(e){case p.INT32:i="int32";break;case p.STRING:c=r||!t.length,n=f.LengthDelimited,i="string";break;case p.BOOL:c=t===!1,i="bool";break;case p.UINT32:i="uint32";break;case p.DOUBLE:n=f.Bit64,i="double";break;case p.FLOAT:n=f.Bit32,i="float";break;case p.INT64:c=r||T.from(t).isZero(),i="int64";break;case p.UINT64:c=r||O.from(t).isZero(),i="uint64";break;case p.FIXED64:c=r||O.from(t).isZero(),n=f.Bit64,i="fixed64";break;case p.BYTES:c=r||!t.byteLength,n=f.LengthDelimited,i="bytes";break;case p.FIXED32:n=f.Bit32,i="fixed32";break;case p.SFIXED32:n=f.Bit32,i="sfixed32";break;case p.SFIXED64:c=r||T.from(t).isZero(),n=f.Bit64,i="sfixed64";break;case p.SINT32:i="sint32";break;case p.SINT64:c=r||T.from(t).isZero(),i="sint64";break}return[n,i,r||c]}};var ho=g(h());function Kr(l){let e=l.messagePrototype?Object.create(l.messagePrototype):Object.defineProperty({},Pe,{value:l});for(let t of l.fields){let n=t.localName;if(!t.opt)if(t.oneof)e[t.oneof]={oneofKind:void 0};else if(t.repeat)e[n]=[];else switch(t.kind){case"scalar":e[n]=he(t.T,t.L);break;case"enum":e[n]=0;break;case"map":e[n]={};break}}return e}var go=g(h());function y(l,e,t){let n,i=t,r;for(let c of l.fields){let o=c.localName;if(c.oneof){let s=i[c.oneof];if(s?.oneofKind==null)continue;if(n=s[o],r=e[c.oneof],r.oneofKind=s.oneofKind,n==null){delete r[o];continue}}else if(n=i[o],r=e,n==null)continue;switch(c.repeat&&(r[o].length=n.length),c.kind){case"scalar":case"enum":if(c.repeat)for(let a=0;a<n.length;a++)r[o][a]=n[a];else r[o]=n;break;case"message":let s=c.T();if(c.repeat)for(let a=0;a<n.length;a++)r[o][a]=s.create(n[a]);else r[o]===void 0?r[o]=s.create(n):s.mergePartial(r[o],n);break;case"map":switch(c.V.kind){case"scalar":case"enum":Object.assign(r[o],n);break;case"message":let a=c.V.T();for(let u of Object.keys(n))r[o][u]=a.create(n[u]);break}break}}}var Ro=g(h());function Jr(l,e,t){if(e===t)return!0;if(!e||!t)return!1;for(let n of l.fields){let i=n.localName,r=n.oneof?e[n.oneof][i]:e[i],c=n.oneof?t[n.oneof][i]:t[i];switch(n.kind){case"enum":case"scalar":let o=n.kind=="enum"?p.INT32:n.T;if(!(n.repeat?Hr(o,r,c):Xr(o,r,c)))return!1;break;case"map":if(!(n.V.kind=="message"?_r(n.V.T(),De(r),De(c)):Hr(n.V.kind=="enum"?p.INT32:n.V.T,De(r),De(c))))return!1;break;case"message":let s=n.T();if(!(n.repeat?_r(s,r,c):s.equals(r,c)))return!1;break}}return!0}var De=Object.values;function Xr(l,e,t){if(e===t)return!0;if(l!==p.BYTES)return!1;let n=e,i=t;if(n.length!==i.length)return!1;for(let r=0;r<n.length;r++)if(n[r]!=i[r])return!1;return!0}function Hr(l,e,t){if(e.length!==t.length)return!1;for(let n=0;n<e.length;n++)if(!Xr(l,e[n],t[n]))return!1;return!0}function _r(l,e,t){if(e.length!==t.length)return!1;for(let n=0;n<e.length;n++)if(!l.equals(e[n],t[n]))return!1;return!0}var Ci=Object.getOwnPropertyDescriptors(Object.getPrototypeOf({})),m=class{constructor(e,t,n){this.defaultCheckDepth=16,this.typeName=e,this.fields=t.map(vr),this.options=n??{},this.messagePrototype=Object.create(null,Object.assign(Object.assign({},Ci),{[Pe]:{value:this}})),this.refTypeCheck=new Ue(this),this.refJsonReader=new Ee(this),this.refJsonWriter=new Fe(this),this.refBinReader=new Le(this),this.refBinWriter=new Ae(this)}create(e){let t=Kr(this);return e!==void 0&&y(this,t,e),t}clone(e){let t=this.create();return y(this,t,e),t}equals(e,t){return Jr(this,e,t)}is(e,t=this.defaultCheckDepth){return this.refTypeCheck.is(e,t,!1)}isAssignable(e,t=this.defaultCheckDepth){return this.refTypeCheck.is(e,t,!0)}mergePartial(e,t){y(this,e,t)}fromBinary(e,t){let n=Lr(t);return this.internalBinaryRead(n.readerFactory(e),e.byteLength,n)}fromJson(e,t){return this.internalJsonRead(e,Vr(t))}fromJsonString(e,t){let n=JSON.parse(e);return this.fromJson(n,t)}toJson(e,t){return this.internalJsonWrite(e,Mr(t))}toJsonString(e,t){var n;let i=this.toJson(e,t);return JSON.stringify(i,null,(n=t?.prettySpaces)!==null&&n!==void 0?n:0)}toBinary(e,t){let n=Dr(t);return this.internalBinaryWrite(e,n.writerFactory(),n).finish()}internalJsonRead(e,t,n){if(e!==null&&typeof e=="object"&&!Array.isArray(e)){let i=n??this.create();return this.refJsonReader.read(e,i,t),i}throw new Error(`Unable to parse message ${this.typeName} from JSON ${Be(e)}.`)}internalJsonWrite(e,t){return this.refJsonWriter.write(e,t)}internalBinaryWrite(e,t,n){return this.refBinWriter.write(e,t,n),t}internalBinaryRead(e,t,n,i){let r=i??this.create();return this.refBinReader.read(e,r,n,t),r}};var us=g(h(),1);var qo=g(h(),1);var Je=class extends m{constructor(){super("youtube.component.Label",[{no:1,name:"runs",kind:"message",repeat:1,T:()=>q}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.runs=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.runs.push(q.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.runs.length;r++)q.internalBinaryWrite(e.runs[r],t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},W=new Je,Xe=class extends m{constructor(){super("youtube.component.Run",[{no:1,name:"text",kind:"scalar",T:9}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.text="",e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.text=e.string();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.text!==""&&t.tag(1,f.LengthDelimited).string(e.text);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},q=new Xe;var ts=g(h(),1);var ze=class extends m{constructor(){super("youtube.component.ResponseContext",[{no:6,name:"serviceTrackingParams",kind:"message",repeat:1,T:()=>qe}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.serviceTrackingParams=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 6:r.serviceTrackingParams.push(qe.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.serviceTrackingParams.length;r++)qe.internalBinaryWrite(e.serviceTrackingParams[r],t.tag(6,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},$e=new ze,Ze=class extends m{constructor(){super("youtube.component.ServiceTrackingParam",[{no:1,name:"service",kind:"scalar",T:5},{no:2,name:"params",kind:"message",repeat:1,T:()=>Ye}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.service=0,t.params=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.service=e.int32();break;case 2:r.params.push(Ye.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.service!==0&&t.tag(1,f.Varint).int32(e.service);for(let r=0;r<e.params.length;r++)Ye.internalBinaryWrite(e.params[r],t.tag(2,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},qe=new Ze,Qe=class extends m{constructor(){super("youtube.component.Param",[{no:1,name:"key",kind:"scalar",T:9},{no:2,name:"value",kind:"scalar",T:9}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.key="",t.value="",e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.key=e.string();break;case 2:r.value=e.string();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.key!==""&&t.tag(1,f.LengthDelimited).string(e.key),e.value!==""&&t.tag(2,f.LengthDelimited).string(e.value);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Ye=new Qe;var mt=class extends m{constructor(){super("youtube.response.browse.Browse",[{no:1,name:"responseContext",kind:"message",T:()=>$e},{no:9,name:"content",kind:"message",T:()=>E},{no:10,name:"onResponseReceivedAction",kind:"message",T:()=>E}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.responseContext=$e.internalBinaryRead(e,e.uint32(),n,r.responseContext);break;case 9:r.content=E.internalBinaryRead(e,e.uint32(),n,r.content);break;case 10:r.onResponseReceivedAction=E.internalBinaryRead(e,e.uint32(),n,r.onResponseReceivedAction);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.responseContext&&$e.internalBinaryWrite(e.responseContext,t.tag(1,f.LengthDelimited).fork(),n).join(),e.content&&E.internalBinaryWrite(e.content,t.tag(9,f.LengthDelimited).fork(),n).join(),e.onResponseReceivedAction&&E.internalBinaryWrite(e.onResponseReceivedAction,t.tag(10,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},qr=new mt,gt=class extends m{constructor(){super("youtube.response.browse.Content",[{no:58173949,name:"singleColumnResultsRenderer",kind:"message",T:()=>et},{no:153515154,name:"elementRenderer",kind:"message",T:()=>ne},{no:49399797,name:"sectionListRenderer",kind:"message",T:()=>Y}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 58173949:r.singleColumnResultsRenderer=et.internalBinaryRead(e,e.uint32(),n,r.singleColumnResultsRenderer);break;case 153515154:r.elementRenderer=ne.internalBinaryRead(e,e.uint32(),n,r.elementRenderer);break;case 49399797:r.sectionListRenderer=Y.internalBinaryRead(e,e.uint32(),n,r.sectionListRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.singleColumnResultsRenderer&&et.internalBinaryWrite(e.singleColumnResultsRenderer,t.tag(58173949,f.LengthDelimited).fork(),n).join(),e.elementRenderer&&ne.internalBinaryWrite(e.elementRenderer,t.tag(153515154,f.LengthDelimited).fork(),n).join(),e.sectionListRenderer&&Y.internalBinaryWrite(e.sectionListRenderer,t.tag(49399797,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},E=new gt,bt=class extends m{constructor(){super("youtube.response.browse.SingleColumnResultsRenderer",[{no:1,name:"tabs",kind:"message",repeat:1,T:()=>tt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.tabs=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.tabs.push(tt.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.tabs.length;r++)tt.internalBinaryWrite(e.tabs[r],t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},et=new bt,kt=class extends m{constructor(){super("youtube.response.browse.BrowseTabSupportedRenderer",[{no:58174010,name:"tabRenderer",kind:"message",T:()=>nt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 58174010:r.tabRenderer=nt.internalBinaryRead(e,e.uint32(),n,r.tabRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.tabRenderer&&nt.internalBinaryWrite(e.tabRenderer,t.tag(58174010,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},tt=new kt,Rt=class extends m{constructor(){super("youtube.response.browse.TabRenderer",[{no:4,name:"content",kind:"message",T:()=>E}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 4:r.content=E.internalBinaryRead(e,e.uint32(),n,r.content);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.content&&E.internalBinaryWrite(e.content,t.tag(4,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},nt=new Rt,wt=class extends m{constructor(){super("youtube.response.browse.SectionListRenderer",[{no:1,name:"sectionListSupportedRenderers",kind:"message",repeat:1,T:()=>rt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.sectionListSupportedRenderers=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.sectionListSupportedRenderers.push(rt.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.sectionListSupportedRenderers.length;r++)rt.internalBinaryWrite(e.sectionListSupportedRenderers[r],t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Y=new wt,Bt=class extends m{constructor(){super("youtube.response.browse.SectionListSupportedRenderer",[{no:50195462,name:"itemSectionRenderer",kind:"message",T:()=>z},{no:51845067,name:"shelfRenderer",kind:"message",T:()=>dt},{no:221496734,name:"musicDescriptionShelfRenderer",kind:"message",T:()=>ht}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 50195462:r.itemSectionRenderer=z.internalBinaryRead(e,e.uint32(),n,r.itemSectionRenderer);break;case 51845067:r.shelfRenderer=dt.internalBinaryRead(e,e.uint32(),n,r.shelfRenderer);break;case 221496734:r.musicDescriptionShelfRenderer=ht.internalBinaryRead(e,e.uint32(),n,r.musicDescriptionShelfRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.itemSectionRenderer&&z.internalBinaryWrite(e.itemSectionRenderer,t.tag(50195462,f.LengthDelimited).fork(),n).join(),e.shelfRenderer&&dt.internalBinaryWrite(e.shelfRenderer,t.tag(51845067,f.LengthDelimited).fork(),n).join(),e.musicDescriptionShelfRenderer&&ht.internalBinaryWrite(e.musicDescriptionShelfRenderer,t.tag(221496734,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},rt=new Bt,It=class extends m{constructor(){super("youtube.response.browse.ItemSectionRenderer",[{no:1,name:"richItemContents",kind:"message",repeat:1,T:()=>te}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.richItemContents=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.richItemContents.push(te.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.richItemContents.length;r++)te.internalBinaryWrite(e.richItemContents[r],t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},z=new It,Tt=class extends m{constructor(){super("youtube.response.browse.RichItemContent",[{no:153515154,name:"videoWithContextRenderer",kind:"message",T:()=>ne}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 153515154:r.videoWithContextRenderer=ne.internalBinaryRead(e,e.uint32(),n,r.videoWithContextRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.videoWithContextRenderer&&ne.internalBinaryWrite(e.videoWithContextRenderer,t.tag(153515154,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},te=new Tt,Ct=class extends m{constructor(){super("youtube.response.browse.ElementRenderer",[{no:172660663,name:"videoRendererContent",kind:"message",T:()=>it}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 172660663:r.videoRendererContent=it.internalBinaryRead(e,e.uint32(),n,r.videoRendererContent);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.videoRendererContent&&it.internalBinaryWrite(e.videoRendererContent,t.tag(172660663,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ne=new Ct,xt=class extends m{constructor(){super("youtube.response.browse.VideoRendererContent",[{no:1,name:"videoInfo",kind:"message",T:()=>at},{no:2,name:"renderInfo",kind:"message",T:()=>ut}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.videoInfo=at.internalBinaryRead(e,e.uint32(),n,r.videoInfo);break;case 2:r.renderInfo=ut.internalBinaryRead(e,e.uint32(),n,r.renderInfo);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.videoInfo&&at.internalBinaryWrite(e.videoInfo,t.tag(1,f.LengthDelimited).fork(),n).join(),e.renderInfo&&ut.internalBinaryWrite(e.renderInfo,t.tag(2,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},it=new xt,Wt=class extends m{constructor(){super("youtube.response.browse.VideoInfo",[{no:168777401,name:"videoContext",kind:"message",T:()=>ot}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 168777401:r.videoContext=ot.internalBinaryRead(e,e.uint32(),n,r.videoContext);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.videoContext&&ot.internalBinaryWrite(e.videoContext,t.tag(168777401,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},at=new Wt,Nt=class extends m{constructor(){super("youtube.response.browse.VideoContext",[{no:5,name:"videoContent",kind:"message",T:()=>st}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 5:r.videoContent=st.internalBinaryRead(e,e.uint32(),n,r.videoContent);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.videoContent&&st.internalBinaryWrite(e.videoContent,t.tag(5,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ot=new Nt,St=class extends m{constructor(){super("youtube.response.browse.VideoContent",[{no:465160965,name:"timedLyricsRender",kind:"message",T:()=>lt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 465160965:r.timedLyricsRender=lt.internalBinaryRead(e,e.uint32(),n,r.timedLyricsRender);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.timedLyricsRender&&lt.internalBinaryWrite(e.timedLyricsRender,t.tag(465160965,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},st=new St,Ot=class extends m{constructor(){super("youtube.response.browse.TimedLyricsRender",[{no:4,name:"timedLyricsContent",kind:"message",T:()=>ct}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 4:r.timedLyricsContent=ct.internalBinaryRead(e,e.uint32(),n,r.timedLyricsContent);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.timedLyricsContent&&ct.internalBinaryWrite(e.timedLyricsContent,t.tag(4,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},lt=new Ot,Pt=class extends m{constructor(){super("youtube.response.browse.TimedLyricsContent",[{no:1,name:"runs",kind:"message",repeat:1,T:()=>q},{no:2,name:"footerLabel",kind:"scalar",T:9}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.runs=[],t.footerLabel="",e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.runs.push(q.internalBinaryRead(e,e.uint32(),n));break;case 2:r.footerLabel=e.string();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.runs.length;r++)q.internalBinaryWrite(e.runs[r],t.tag(1,f.LengthDelimited).fork(),n).join();e.footerLabel!==""&&t.tag(2,f.LengthDelimited).string(e.footerLabel);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ct=new Pt,Ut=class extends m{constructor(){super("youtube.response.browse.RenderInfo",[{no:183314536,name:"layoutRender",kind:"message",T:()=>ft}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 183314536:r.layoutRender=ft.internalBinaryRead(e,e.uint32(),n,r.layoutRender);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.layoutRender&&ft.internalBinaryWrite(e.layoutRender,t.tag(183314536,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ut=new Ut,Et=class extends m{constructor(){super("youtube.response.browse.LayoutRender",[{no:1,name:"eml",kind:"scalar",T:9}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.eml="",e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.eml=e.string();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.eml!==""&&t.tag(1,f.LengthDelimited).string(e.eml);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ft=new Et,Ft=class extends m{constructor(){super("youtube.response.browse.ShelfRenderer",[{no:5,name:"richSectionContent",kind:"message",T:()=>pt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 5:r.richSectionContent=pt.internalBinaryRead(e,e.uint32(),n,r.richSectionContent);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.richSectionContent&&pt.internalBinaryWrite(e.richSectionContent,t.tag(5,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},dt=new Ft,Lt=class extends m{constructor(){super("youtube.response.browse.RichSectionContent",[{no:51431404,name:"reelShelfRenderer",kind:"message",T:()=>yt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 51431404:r.reelShelfRenderer=yt.internalBinaryRead(e,e.uint32(),n,r.reelShelfRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.reelShelfRenderer&&yt.internalBinaryWrite(e.reelShelfRenderer,t.tag(51431404,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},pt=new Lt,At=class extends m{constructor(){super("youtube.response.browse.ReelShelfRenderer",[{no:1,name:"richItemContents",kind:"message",repeat:1,T:()=>te}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.richItemContents=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.richItemContents.push(te.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.richItemContents.length;r++)te.internalBinaryWrite(e.richItemContents[r],t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},yt=new At,Dt=class extends m{constructor(){super("youtube.response.browse.MusicDescriptionShelfRenderer",[{no:3,name:"description",kind:"message",T:()=>W},{no:10,name:"footer",kind:"message",T:()=>W}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 3:r.description=W.internalBinaryRead(e,e.uint32(),n,r.description);break;case 10:r.footer=W.internalBinaryRead(e,e.uint32(),n,r.footer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.description&&W.internalBinaryWrite(e.description,t.tag(3,f.LengthDelimited).fork(),n).join(),e.footer&&W.internalBinaryWrite(e.footer,t.tag(10,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ht=new Dt;var gs=g(h(),1);var Vt=class extends m{constructor(){super("youtube.response.next.Next",[{no:7,name:"content",kind:"message",T:()=>$t},{no:8,name:"onResponseReceivedAction",kind:"message",T:()=>E}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 7:r.content=$t.internalBinaryRead(e,e.uint32(),n,r.content);break;case 8:r.onResponseReceivedAction=E.internalBinaryRead(e,e.uint32(),n,r.onResponseReceivedAction);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.content&&$t.internalBinaryWrite(e.content,t.tag(7,f.LengthDelimited).fork(),n).join(),e.onResponseReceivedAction&&E.internalBinaryWrite(e.onResponseReceivedAction,t.tag(8,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},re=new Vt,Mt=class extends m{constructor(){super("youtube.response.next.Content",[{no:51779735,name:"nextResult",kind:"message",T:()=>jt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 51779735:r.nextResult=jt.internalBinaryRead(e,e.uint32(),n,r.nextResult);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.nextResult&&jt.internalBinaryWrite(e.nextResult,t.tag(51779735,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},$t=new Mt,vt=class extends m{constructor(){super("youtube.response.next.NextResult",[{no:1,name:"content",kind:"message",T:()=>E}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.content=E.internalBinaryRead(e,e.uint32(),n,r.content);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.content&&E.internalBinaryWrite(e.content,t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},jt=new vt;var xs=g(h(),1);var Kt=class extends m{constructor(){super("youtube.response.search.Search",[{no:4,name:"content",kind:"message",T:()=>E},{no:7,name:"onResponseReceivedCommand",kind:"message",T:()=>Gt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 4:r.content=E.internalBinaryRead(e,e.uint32(),n,r.content);break;case 7:r.onResponseReceivedCommand=Gt.internalBinaryRead(e,e.uint32(),n,r.onResponseReceivedCommand);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.content&&E.internalBinaryWrite(e.content,t.tag(4,f.LengthDelimited).fork(),n).join(),e.onResponseReceivedCommand&&Gt.internalBinaryWrite(e.onResponseReceivedCommand,t.tag(7,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Yr=new Kt,Ht=class extends m{constructor(){super("youtube.response.search.OnResponseReceivedCommand",[{no:50195462,name:"itemSectionRenderer",kind:"message",T:()=>z},{no:49399797,name:"appendContinuationItemsAction",kind:"message",T:()=>Y}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 50195462:r.itemSectionRenderer=z.internalBinaryRead(e,e.uint32(),n,r.itemSectionRenderer);break;case 49399797:r.appendContinuationItemsAction=Y.internalBinaryRead(e,e.uint32(),n,r.appendContinuationItemsAction);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.itemSectionRenderer&&z.internalBinaryWrite(e.itemSectionRenderer,t.tag(50195462,f.LengthDelimited).fork(),n).join(),e.appendContinuationItemsAction&&Y.internalBinaryWrite(e.appendContinuationItemsAction,t.tag(49399797,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Gt=new Ht;var Us=g(h(),1);var Zt=class extends m{constructor(){super("youtube.response.shorts.Shorts",[{no:2,name:"entries",kind:"message",repeat:2,T:()=>_t}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.entries=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 2:r.entries.push(_t.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.entries.length;r++)_t.internalBinaryWrite(e.entries[r],t.tag(2,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},zr=new Zt,Qt=class extends m{constructor(){super("youtube.response.shorts.Entry",[{no:1,name:"command",kind:"message",T:()=>Jt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.command=Jt.internalBinaryRead(e,e.uint32(),n,r.command);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.command&&Jt.internalBinaryWrite(e.command,t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},_t=new Qt,en=class extends m{constructor(){super("youtube.response.shorts.Command",[{no:139608561,name:"reelWatchEndpoint",kind:"message",T:()=>Xt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 139608561:r.reelWatchEndpoint=Xt.internalBinaryRead(e,e.uint32(),n,r.reelWatchEndpoint);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.reelWatchEndpoint&&Xt.internalBinaryWrite(e.reelWatchEndpoint,t.tag(139608561,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Jt=new en,tn=class extends m{constructor(){super("youtube.response.shorts.ReelWatchEndpoint",[{no:8,name:"overlay",kind:"message",T:()=>Yt},{no:16,name:"adClientParams",kind:"message",T:()=>qt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 8:r.overlay=Yt.internalBinaryRead(e,e.uint32(),n,r.overlay);break;case 16:r.adClientParams=qt.internalBinaryRead(e,e.uint32(),n,r.adClientParams);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.overlay&&Yt.internalBinaryWrite(e.overlay,t.tag(8,f.LengthDelimited).fork(),n).join(),e.adClientParams&&qt.internalBinaryWrite(e.adClientParams,t.tag(16,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Xt=new tn,nn=class extends m{constructor(){super("youtube.response.shorts.AdClientParams",[{no:1,name:"isAd",kind:"scalar",T:8}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.isAd=!1,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.isAd=e.bool();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.isAd!==!1&&t.tag(1,f.Varint).bool(e.isAd);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},qt=new nn,rn=class extends m{constructor(){super("youtube.response.shorts.Overlay",[{no:139970731,name:"reelPlayerOverlayRenderer",kind:"message",T:()=>zt}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 139970731:r.reelPlayerOverlayRenderer=zt.internalBinaryRead(e,e.uint32(),n,r.reelPlayerOverlayRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.reelPlayerOverlayRenderer&&zt.internalBinaryWrite(e.reelPlayerOverlayRenderer,t.tag(139970731,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Yt=new rn,an=class extends m{constructor(){super("youtube.response.shorts.ReelPlayerOverlayRenderer",[{no:12,name:"style",kind:"scalar",T:5}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.style=0,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 12:r.style=e.int32();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.style!==0&&t.tag(12,f.Varint).int32(e.style);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},zt=new an;var $s=g(h(),1);var ln=class extends m{constructor(){super("youtube.response.guide.Guide",[{no:4,name:"labelItems",kind:"message",repeat:1,T:()=>ie},{no:6,name:"iconItems",kind:"message",repeat:1,T:()=>ie}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.labelItems=[],t.iconItems=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 4:r.labelItems.push(ie.internalBinaryRead(e,e.uint32(),n));break;case 6:r.iconItems.push(ie.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.labelItems.length;r++)ie.internalBinaryWrite(e.labelItems[r],t.tag(4,f.LengthDelimited).fork(),n).join();for(let r=0;r<e.iconItems.length;r++)ie.internalBinaryWrite(e.iconItems[r],t.tag(6,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Zr=new ln,cn=class extends m{constructor(){super("youtube.response.guide.Item",[{no:117866661,name:"guideSectionRenderer",kind:"message",T:()=>on}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 117866661:r.guideSectionRenderer=on.internalBinaryRead(e,e.uint32(),n,r.guideSectionRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.guideSectionRenderer&&on.internalBinaryWrite(e.guideSectionRenderer,t.tag(117866661,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ie=new cn,un=class extends m{constructor(){super("youtube.response.guide.GuideSectionRenderer",[{no:1,name:"rendererItems",kind:"message",repeat:1,T:()=>sn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.rendererItems=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.rendererItems.push(sn.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.rendererItems.length;r++)sn.internalBinaryWrite(e.rendererItems[r],t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},on=new un,fn=class extends m{constructor(){super("youtube.response.guide.RendererItem",[{no:318370163,name:"iconRender",kind:"message",T:()=>ae},{no:117501096,name:"labelRender",kind:"message",T:()=>ae}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 318370163:r.iconRender=ae.internalBinaryRead(e,e.uint32(),n,r.iconRender);break;case 117501096:r.labelRender=ae.internalBinaryRead(e,e.uint32(),n,r.labelRender);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.iconRender&&ae.internalBinaryWrite(e.iconRender,t.tag(318370163,f.LengthDelimited).fork(),n).join(),e.labelRender&&ae.internalBinaryWrite(e.labelRender,t.tag(117501096,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},sn=new fn,dn=class extends m{constructor(){super("youtube.response.guide.guideEntryRenderer",[{no:1,name:"browseId",kind:"scalar",T:9}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.browseId="",e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.browseId=e.string();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.browseId!==""&&t.tag(1,f.LengthDelimited).string(e.browseId);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ae=new dn;var Hs=g(h(),1);var Tn=class extends m{constructor(){super("youtube.response.player.Player",[{no:7,name:"adPlacements",kind:"message",repeat:1,T:()=>pn},{no:2,name:"playabilityStatus",kind:"message",T:()=>hn},{no:9,name:"playbackTracking",kind:"message",T:()=>bn},{no:10,name:"captions",kind:"message",T:()=>kn},{no:68,name:"adSlots",kind:"message",repeat:1,T:()=>Bn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.adPlacements=[],t.adSlots=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 7:r.adPlacements.push(pn.internalBinaryRead(e,e.uint32(),n));break;case 2:r.playabilityStatus=hn.internalBinaryRead(e,e.uint32(),n,r.playabilityStatus);break;case 9:r.playbackTracking=bn.internalBinaryRead(e,e.uint32(),n,r.playbackTracking);break;case 10:r.captions=kn.internalBinaryRead(e,e.uint32(),n,r.captions);break;case 68:r.adSlots.push(Bn.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.adPlacements.length;r++)pn.internalBinaryWrite(e.adPlacements[r],t.tag(7,f.LengthDelimited).fork(),n).join();e.playabilityStatus&&hn.internalBinaryWrite(e.playabilityStatus,t.tag(2,f.LengthDelimited).fork(),n).join(),e.playbackTracking&&bn.internalBinaryWrite(e.playbackTracking,t.tag(9,f.LengthDelimited).fork(),n).join(),e.captions&&kn.internalBinaryWrite(e.captions,t.tag(10,f.LengthDelimited).fork(),n).join();for(let r=0;r<e.adSlots.length;r++)Bn.internalBinaryWrite(e.adSlots[r],t.tag(68,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},oe=new Tn,Cn=class extends m{constructor(){super("youtube.response.player.AdPlacement",[{no:84813246,name:"adPlacementRenderer",kind:"message",T:()=>yn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 84813246:r.adPlacementRenderer=yn.internalBinaryRead(e,e.uint32(),n,r.adPlacementRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.adPlacementRenderer&&yn.internalBinaryWrite(e.adPlacementRenderer,t.tag(84813246,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},pn=new Cn,xn=class extends m{constructor(){super("youtube.response.player.AdPlacementRenderer",[{no:4,name:"params",kind:"scalar",T:9}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.params="",e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 4:r.params=e.string();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.params!==""&&t.tag(4,f.LengthDelimited).string(e.params);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},yn=new xn,Wn=class extends m{constructor(){super("youtube.response.player.PlayabilityStatus",[{no:21,name:"pictureInPictureRender",kind:"message",T:()=>me},{no:11,name:"backgroundPlayerRender",kind:"message",T:()=>ge}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 21:r.pictureInPictureRender=me.internalBinaryRead(e,e.uint32(),n,r.pictureInPictureRender);break;case 11:r.backgroundPlayerRender=ge.internalBinaryRead(e,e.uint32(),n,r.backgroundPlayerRender);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.pictureInPictureRender&&me.internalBinaryWrite(e.pictureInPictureRender,t.tag(21,f.LengthDelimited).fork(),n).join(),e.backgroundPlayerRender&&ge.internalBinaryWrite(e.backgroundPlayerRender,t.tag(11,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},hn=new Wn,Nn=class extends m{constructor(){super("youtube.response.player.PictureInPictureSupportedRenderer",[{no:151635310,name:"pictureInPictureAbility",kind:"message",T:()=>mn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 151635310:r.pictureInPictureAbility=mn.internalBinaryRead(e,e.uint32(),n,r.pictureInPictureAbility);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.pictureInPictureAbility&&mn.internalBinaryWrite(e.pictureInPictureAbility,t.tag(151635310,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},me=new Nn,Sn=class extends m{constructor(){super("youtube.response.player.BackgroundSupportedRenderer",[{no:64657230,name:"backgroundAbility",kind:"message",T:()=>gn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 64657230:r.backgroundAbility=gn.internalBinaryRead(e,e.uint32(),n,r.backgroundAbility);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.backgroundAbility&&gn.internalBinaryWrite(e.backgroundAbility,t.tag(64657230,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ge=new Sn,On=class extends m{constructor(){super("youtube.response.player.PictureInPictureAbility",[{no:1,name:"active",kind:"scalar",T:8},{no:4,name:"f4",kind:"scalar",T:5},{no:6,name:"f6",kind:"scalar",T:5},{no:8,name:"f8",kind:"scalar",T:5}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.active=!1,t.f4=0,t.f6=0,t.f8=0,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.active=e.bool();break;case 4:r.f4=e.int32();break;case 6:r.f6=e.int32();break;case 8:r.f8=e.int32();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.active!==!1&&t.tag(1,f.Varint).bool(e.active),e.f4!==0&&t.tag(4,f.Varint).int32(e.f4),e.f6!==0&&t.tag(6,f.Varint).int32(e.f6),e.f8!==0&&t.tag(8,f.Varint).int32(e.f8);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},mn=new On,Pn=class extends m{constructor(){super("youtube.response.player.BackgroundAbility",[{no:1,name:"active",kind:"scalar",T:8}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.active=!1,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.active=e.bool();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.active!==!1&&t.tag(1,f.Varint).bool(e.active);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},gn=new Pn,Un=class extends m{constructor(){super("youtube.response.player.PlaybackTracking",[{no:1,name:"videostatsPlaybackUrl",kind:"message",T:()=>P},{no:2,name:"videostatsDelayplayUrl",kind:"message",T:()=>P},{no:3,name:"videostatsWatchtimeUrl",kind:"message",T:()=>P},{no:4,name:"ptrackingUrl",kind:"message",T:()=>P},{no:5,name:"qoeUrl",kind:"message",T:()=>P},{no:13,name:"atrUrl",kind:"message",T:()=>P},{no:15,name:"videostatsEngageUrl",kind:"message",T:()=>P},{no:18,name:"pageadViewthroughconversion",kind:"message",T:()=>P}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.videostatsPlaybackUrl=P.internalBinaryRead(e,e.uint32(),n,r.videostatsPlaybackUrl);break;case 2:r.videostatsDelayplayUrl=P.internalBinaryRead(e,e.uint32(),n,r.videostatsDelayplayUrl);break;case 3:r.videostatsWatchtimeUrl=P.internalBinaryRead(e,e.uint32(),n,r.videostatsWatchtimeUrl);break;case 4:r.ptrackingUrl=P.internalBinaryRead(e,e.uint32(),n,r.ptrackingUrl);break;case 5:r.qoeUrl=P.internalBinaryRead(e,e.uint32(),n,r.qoeUrl);break;case 13:r.atrUrl=P.internalBinaryRead(e,e.uint32(),n,r.atrUrl);break;case 15:r.videostatsEngageUrl=P.internalBinaryRead(e,e.uint32(),n,r.videostatsEngageUrl);break;case 18:r.pageadViewthroughconversion=P.internalBinaryRead(e,e.uint32(),n,r.pageadViewthroughconversion);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.videostatsPlaybackUrl&&P.internalBinaryWrite(e.videostatsPlaybackUrl,t.tag(1,f.LengthDelimited).fork(),n).join(),e.videostatsDelayplayUrl&&P.internalBinaryWrite(e.videostatsDelayplayUrl,t.tag(2,f.LengthDelimited).fork(),n).join(),e.videostatsWatchtimeUrl&&P.internalBinaryWrite(e.videostatsWatchtimeUrl,t.tag(3,f.LengthDelimited).fork(),n).join(),e.ptrackingUrl&&P.internalBinaryWrite(e.ptrackingUrl,t.tag(4,f.LengthDelimited).fork(),n).join(),e.qoeUrl&&P.internalBinaryWrite(e.qoeUrl,t.tag(5,f.LengthDelimited).fork(),n).join(),e.atrUrl&&P.internalBinaryWrite(e.atrUrl,t.tag(13,f.LengthDelimited).fork(),n).join(),e.videostatsEngageUrl&&P.internalBinaryWrite(e.videostatsEngageUrl,t.tag(15,f.LengthDelimited).fork(),n).join(),e.pageadViewthroughconversion&&P.internalBinaryWrite(e.pageadViewthroughconversion,t.tag(18,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},bn=new Un,En=class extends m{constructor(){super("youtube.response.player.Tracking",[{no:1,name:"baseUrl",kind:"scalar",T:9}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.baseUrl="",e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.baseUrl=e.string();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.baseUrl!==""&&t.tag(1,f.LengthDelimited).string(e.baseUrl);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},P=new En,Fn=class extends m{constructor(){super("youtube.response.player.Captions",[{no:51621377,name:"playerCaptionsTrackListRenderer",kind:"message",jsonName:"playerCaptionsTracklistRenderer",T:()=>Rn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 51621377:r.playerCaptionsTrackListRenderer=Rn.internalBinaryRead(e,e.uint32(),n,r.playerCaptionsTrackListRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.playerCaptionsTrackListRenderer&&Rn.internalBinaryWrite(e.playerCaptionsTrackListRenderer,t.tag(51621377,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},kn=new Fn,Ln=class extends m{constructor(){super("youtube.response.player.PlayerCaptionsTrackListRenderer",[{no:1,name:"captionTracks",kind:"message",repeat:1,T:()=>be},{no:2,name:"audioTracks",kind:"message",repeat:1,T:()=>wn},{no:3,name:"translationLanguages",kind:"message",repeat:1,T:()=>ke},{no:4,name:"defaultAudioTrackIndex",kind:"scalar",opt:!0,T:5},{no:6,name:"defaultCaptionTrackIndex",kind:"scalar",opt:!0,T:5}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.captionTracks=[],t.audioTracks=[],t.translationLanguages=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.captionTracks.push(be.internalBinaryRead(e,e.uint32(),n));break;case 2:r.audioTracks.push(wn.internalBinaryRead(e,e.uint32(),n));break;case 3:r.translationLanguages.push(ke.internalBinaryRead(e,e.uint32(),n));break;case 4:r.defaultAudioTrackIndex=e.int32();break;case 6:r.defaultCaptionTrackIndex=e.int32();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.captionTracks.length;r++)be.internalBinaryWrite(e.captionTracks[r],t.tag(1,f.LengthDelimited).fork(),n).join();for(let r=0;r<e.audioTracks.length;r++)wn.internalBinaryWrite(e.audioTracks[r],t.tag(2,f.LengthDelimited).fork(),n).join();for(let r=0;r<e.translationLanguages.length;r++)ke.internalBinaryWrite(e.translationLanguages[r],t.tag(3,f.LengthDelimited).fork(),n).join();e.defaultAudioTrackIndex!==void 0&&t.tag(4,f.Varint).int32(e.defaultAudioTrackIndex),e.defaultCaptionTrackIndex!==void 0&&t.tag(6,f.Varint).int32(e.defaultCaptionTrackIndex);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Rn=new Ln,An=class extends m{constructor(){super("youtube.response.player.CaptionTrack",[{no:1,name:"baseUrl",kind:"scalar",T:9},{no:2,name:"name",kind:"message",T:()=>W},{no:3,name:"vssId",kind:"scalar",T:9},{no:4,name:"languageCode",kind:"scalar",T:9},{no:5,name:"kind",kind:"scalar",opt:!0,T:9},{no:6,name:"rtl",kind:"scalar",opt:!0,T:8},{no:7,name:"isTranslatable",kind:"scalar",T:8}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.baseUrl="",t.vssId="",t.languageCode="",t.isTranslatable=!1,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.baseUrl=e.string();break;case 2:r.name=W.internalBinaryRead(e,e.uint32(),n,r.name);break;case 3:r.vssId=e.string();break;case 4:r.languageCode=e.string();break;case 5:r.kind=e.string();break;case 6:r.rtl=e.bool();break;case 7:r.isTranslatable=e.bool();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.baseUrl!==""&&t.tag(1,f.LengthDelimited).string(e.baseUrl),e.name&&W.internalBinaryWrite(e.name,t.tag(2,f.LengthDelimited).fork(),n).join(),e.vssId!==""&&t.tag(3,f.LengthDelimited).string(e.vssId),e.languageCode!==""&&t.tag(4,f.LengthDelimited).string(e.languageCode),e.kind!==void 0&&t.tag(5,f.LengthDelimited).string(e.kind),e.rtl!==void 0&&t.tag(6,f.Varint).bool(e.rtl),e.isTranslatable!==!1&&t.tag(7,f.Varint).bool(e.isTranslatable);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},be=new An,Dn=class extends m{constructor(){super("youtube.response.player.AudioTrack",[{no:2,name:"captionTrackIndices",kind:"scalar",repeat:2,T:5},{no:3,name:"defaultCaptionTrackIndex",kind:"scalar",opt:!0,T:5},{no:4,name:"forcedCaptionTrackIndex",kind:"scalar",opt:!0,T:5},{no:5,name:"visibility",kind:"scalar",opt:!0,T:5},{no:6,name:"hasDefaultTrack",kind:"scalar",opt:!0,T:8},{no:7,name:"hasForcedTrack",kind:"scalar",opt:!0,T:8},{no:8,name:"audioTrackId",kind:"scalar",opt:!0,T:9},{no:11,name:"captionsInitialState",kind:"scalar",opt:!0,T:5}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.captionTrackIndices=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 2:if(s===f.LengthDelimited)for(let B=e.int32()+e.pos;e.pos<B;)r.captionTrackIndices.push(e.int32());else r.captionTrackIndices.push(e.int32());break;case 3:r.defaultCaptionTrackIndex=e.int32();break;case 4:r.forcedCaptionTrackIndex=e.int32();break;case 5:r.visibility=e.int32();break;case 6:r.hasDefaultTrack=e.bool();break;case 7:r.hasForcedTrack=e.bool();break;case 8:r.audioTrackId=e.string();break;case 11:r.captionsInitialState=e.int32();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.captionTrackIndices.length;r++)t.tag(2,f.Varint).int32(e.captionTrackIndices[r]);e.defaultCaptionTrackIndex!==void 0&&t.tag(3,f.Varint).int32(e.defaultCaptionTrackIndex),e.forcedCaptionTrackIndex!==void 0&&t.tag(4,f.Varint).int32(e.forcedCaptionTrackIndex),e.visibility!==void 0&&t.tag(5,f.Varint).int32(e.visibility),e.hasDefaultTrack!==void 0&&t.tag(6,f.Varint).bool(e.hasDefaultTrack),e.hasForcedTrack!==void 0&&t.tag(7,f.Varint).bool(e.hasForcedTrack),e.audioTrackId!==void 0&&t.tag(8,f.LengthDelimited).string(e.audioTrackId),e.captionsInitialState!==void 0&&t.tag(11,f.Varint).int32(e.captionsInitialState);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},wn=new Dn,$n=class extends m{constructor(){super("youtube.response.player.TranslationLanguage",[{no:1,name:"languageCode",kind:"scalar",T:9},{no:2,name:"languageName",kind:"message",T:()=>W}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.languageCode="",e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.languageCode=e.string();break;case 2:r.languageName=W.internalBinaryRead(e,e.uint32(),n,r.languageName);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.languageCode!==""&&t.tag(1,f.LengthDelimited).string(e.languageCode),e.languageName&&W.internalBinaryWrite(e.languageName,t.tag(2,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ke=new $n,jn=class extends m{constructor(){super("youtube.response.player.AdSlot",[{no:424701016,name:"render",kind:"message",T:()=>In}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 424701016:r.render=In.internalBinaryRead(e,e.uint32(),n,r.render);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.render&&In.internalBinaryWrite(e.render,t.tag(424701016,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Bn=new jn,Vn=class extends m{constructor(){super("youtube.response.player.AdSlot.Render",[])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){return i??this.create()}internalBinaryWrite(e,t,n){let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},In=new Vn;var Zs=g(h(),1);var Jn=class extends m{constructor(){super("youtube.response.setting.Setting",[{no:6,name:"settingItems",kind:"message",repeat:1,T:()=>_},{no:7,name:"CollectionItems",kind:"message",jsonName:"CollectionItems",repeat:1,T:()=>_}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.settingItems=[],t.collectionItems=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 6:r.settingItems.push(_.internalBinaryRead(e,e.uint32(),n));break;case 7:r.collectionItems.push(_.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.settingItems.length;r++)_.internalBinaryWrite(e.settingItems[r],t.tag(6,f.LengthDelimited).fork(),n).join();for(let r=0;r<e.collectionItems.length;r++)_.internalBinaryWrite(e.collectionItems[r],t.tag(7,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Qr=new Jn,Xn=class extends m{constructor(){super("youtube.response.setting.SettingItem",[{no:88478200,name:"backgroundPlayBackSettingRenderer",kind:"message",T:()=>Mn},{no:66930374,name:"settingCategoryCollectionRenderer",kind:"message",T:()=>vn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 88478200:r.backgroundPlayBackSettingRenderer=Mn.internalBinaryRead(e,e.uint32(),n,r.backgroundPlayBackSettingRenderer);break;case 66930374:r.settingCategoryCollectionRenderer=vn.internalBinaryRead(e,e.uint32(),n,r.settingCategoryCollectionRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.backgroundPlayBackSettingRenderer&&Mn.internalBinaryWrite(e.backgroundPlayBackSettingRenderer,t.tag(88478200,f.LengthDelimited).fork(),n).join(),e.settingCategoryCollectionRenderer&&vn.internalBinaryWrite(e.settingCategoryCollectionRenderer,t.tag(66930374,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},_=new Xn,qn=class extends m{constructor(){super("youtube.response.setting.BackgroundPlayBackSettingRenderer",[{no:1,name:"name",kind:"message",T:()=>W},{no:2,name:"backgroundPlayback",kind:"scalar",T:8},{no:3,name:"download",kind:"scalar",T:8},{no:5,name:"trackingParams",kind:"scalar",T:12},{no:9,name:"downloadQualitySelection",kind:"scalar",T:8},{no:10,name:"smartDownload",kind:"scalar",T:8},{no:14,name:"icon",kind:"message",T:()=>le}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.backgroundPlayback=!1,t.download=!1,t.trackingParams=new Uint8Array(0),t.downloadQualitySelection=!1,t.smartDownload=!1,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.name=W.internalBinaryRead(e,e.uint32(),n,r.name);break;case 2:r.backgroundPlayback=e.bool();break;case 3:r.download=e.bool();break;case 5:r.trackingParams=e.bytes();break;case 9:r.downloadQualitySelection=e.bool();break;case 10:r.smartDownload=e.bool();break;case 14:r.icon=le.internalBinaryRead(e,e.uint32(),n,r.icon);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.name&&W.internalBinaryWrite(e.name,t.tag(1,f.LengthDelimited).fork(),n).join(),e.backgroundPlayback!==!1&&t.tag(2,f.Varint).bool(e.backgroundPlayback),e.download!==!1&&t.tag(3,f.Varint).bool(e.download),e.trackingParams.length&&t.tag(5,f.LengthDelimited).bytes(e.trackingParams),e.downloadQualitySelection!==!1&&t.tag(9,f.Varint).bool(e.downloadQualitySelection),e.smartDownload!==!1&&t.tag(10,f.Varint).bool(e.smartDownload),e.icon&&le.internalBinaryWrite(e.icon,t.tag(14,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Mn=new qn,Yn=class extends m{constructor(){super("youtube.response.setting.SettingCategoryCollectionRenderer",[{no:2,name:"name",kind:"message",T:()=>W},{no:3,name:"subSettings",kind:"message",repeat:1,T:()=>Re},{no:4,name:"categoryId",kind:"scalar",T:5},{no:5,name:"icon",kind:"message",T:()=>le}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.subSettings=[],t.categoryId=0,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 2:r.name=W.internalBinaryRead(e,e.uint32(),n,r.name);break;case 3:r.subSettings.push(Re.internalBinaryRead(e,e.uint32(),n));break;case 4:r.categoryId=e.int32();break;case 5:r.icon=le.internalBinaryRead(e,e.uint32(),n,r.icon);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.name&&W.internalBinaryWrite(e.name,t.tag(2,f.LengthDelimited).fork(),n).join();for(let r=0;r<e.subSettings.length;r++)Re.internalBinaryWrite(e.subSettings[r],t.tag(3,f.LengthDelimited).fork(),n).join();e.categoryId!==0&&t.tag(4,f.Varint).int32(e.categoryId),e.icon&&le.internalBinaryWrite(e.icon,t.tag(5,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},vn=new Yn,zn=class extends m{constructor(){super("youtube.response.setting.Icon",[{no:1,name:"iconType",kind:"scalar",T:5}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.iconType=0,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.iconType=e.int32();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.iconType!==0&&t.tag(1,f.Varint).int32(e.iconType);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},le=new zn,Zn=class extends m{constructor(){super("youtube.response.setting.SubSetting",[{no:61331416,name:"settingBooleanRenderer",kind:"message",T:()=>Gn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 61331416:r.settingBooleanRenderer=Gn.internalBinaryRead(e,e.uint32(),n,r.settingBooleanRenderer);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.settingBooleanRenderer&&Gn.internalBinaryWrite(e.settingBooleanRenderer,t.tag(61331416,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Re=new Zn,Qn=class extends m{constructor(){super("youtube.response.setting.SettingBooleanRenderer",[{no:2,name:"title",kind:"message",T:()=>W},{no:3,name:"description",kind:"message",T:()=>W},{no:5,name:"enableServiceEndpoint",kind:"message",T:()=>se},{no:6,name:"disableServiceEndpoint",kind:"message",T:()=>se},{no:15,name:"itemId",kind:"scalar",T:5}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.itemId=0,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 2:r.title=W.internalBinaryRead(e,e.uint32(),n,r.title);break;case 3:r.description=W.internalBinaryRead(e,e.uint32(),n,r.description);break;case 5:r.enableServiceEndpoint=se.internalBinaryRead(e,e.uint32(),n,r.enableServiceEndpoint);break;case 6:r.disableServiceEndpoint=se.internalBinaryRead(e,e.uint32(),n,r.disableServiceEndpoint);break;case 15:r.itemId=e.int32();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.title&&W.internalBinaryWrite(e.title,t.tag(2,f.LengthDelimited).fork(),n).join(),e.description&&W.internalBinaryWrite(e.description,t.tag(3,f.LengthDelimited).fork(),n).join(),e.enableServiceEndpoint&&se.internalBinaryWrite(e.enableServiceEndpoint,t.tag(5,f.LengthDelimited).fork(),n).join(),e.disableServiceEndpoint&&se.internalBinaryWrite(e.disableServiceEndpoint,t.tag(6,f.LengthDelimited).fork(),n).join(),e.itemId!==0&&t.tag(15,f.Varint).int32(e.itemId);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Gn=new Qn,er=class extends m{constructor(){super("youtube.response.setting.ServiceEndpoint",[{no:81212182,name:"setClientSettingEndpoint",kind:"message",T:()=>Kn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 81212182:r.setClientSettingEndpoint=Kn.internalBinaryRead(e,e.uint32(),n,r.setClientSettingEndpoint);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.setClientSettingEndpoint&&Kn.internalBinaryWrite(e.setClientSettingEndpoint,t.tag(81212182,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},se=new er,tr=class extends m{constructor(){super("youtube.response.setting.SetClientSettingEndpoint",[{no:1,name:"settingData",kind:"message",T:()=>Hn}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.settingData=Hn.internalBinaryRead(e,e.uint32(),n,r.settingData);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.settingData&&Hn.internalBinaryWrite(e.settingData,t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Kn=new tr,nr=class extends m{constructor(){super("youtube.response.setting.SettingData",[{no:1,name:"clientSettingEnum",kind:"message",T:()=>_n},{no:3,name:"boolValue",kind:"scalar",T:8}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.boolValue=!1,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.clientSettingEnum=_n.internalBinaryRead(e,e.uint32(),n,r.clientSettingEnum);break;case 3:r.boolValue=e.bool();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.clientSettingEnum&&_n.internalBinaryWrite(e.clientSettingEnum,t.tag(1,f.LengthDelimited).fork(),n).join(),e.boolValue!==!1&&t.tag(3,f.Varint).bool(e.boolValue);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Hn=new nr,rr=class extends m{constructor(){super("youtube.response.setting.ClientSettingEnum",[{no:1,name:"item",kind:"scalar",T:5}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.item=0,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.item=e.int32();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.item!==0&&t.tag(1,f.Varint).int32(e.item);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},_n=new rr;var ol=g(h(),1);var ir=class extends m{constructor(){super("youtube.response.watch.Watch",[{no:1,name:"contents",kind:"message",repeat:1,T:()=>Z}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.contents=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.contents.push(Z.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.contents.length;r++)Z.internalBinaryWrite(e.contents[r],t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ei=new ir,ar=class extends m{constructor(){super("youtube.response.watch.Content",[{no:2,name:"player",kind:"message",T:()=>oe},{no:3,name:"next",kind:"message",T:()=>re}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 2:r.player=oe.internalBinaryRead(e,e.uint32(),n,r.player);break;case 3:r.next=re.internalBinaryRead(e,e.uint32(),n,r.next);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.player&&oe.internalBinaryWrite(e.player,t.tag(2,f.LengthDelimited).fork(),n).join(),e.next&&re.internalBinaryWrite(e.next,t.tag(3,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Z=new ar;var dl=g(h(),1);var dr=class extends m{constructor(){super("youtube.response.config.Config",[{no:1,name:"response_context",kind:"message",T:()=>or}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.responseContext=or.internalBinaryRead(e,e.uint32(),n,r.responseContext);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.responseContext&&or.internalBinaryWrite(e.responseContext,t.tag(1,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},kr=new dr,pr=class extends m{constructor(){super("youtube.response.config.ResponseContext",[{no:16,name:"globalConfigGroup",kind:"message",T:()=>sr}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 16:r.globalConfigGroup=sr.internalBinaryRead(e,e.uint32(),n,r.globalConfigGroup);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.globalConfigGroup&&sr.internalBinaryWrite(e.globalConfigGroup,t.tag(16,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},or=new pr,yr=class extends m{constructor(){super("youtube.response.config.GlobalConfigGroup",[{no:6,name:"coldConfigGroup",kind:"message",T:()=>lr},{no:7,name:"hotConfigGroup",kind:"message",T:()=>cr},{no:4,name:"hot_hash_data",kind:"scalar",opt:!0,T:9},{no:5,name:"cold_hash_data",kind:"scalar",opt:!0,T:9}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 6:r.coldConfigGroup=lr.internalBinaryRead(e,e.uint32(),n,r.coldConfigGroup);break;case 7:r.hotConfigGroup=cr.internalBinaryRead(e,e.uint32(),n,r.hotConfigGroup);break;case 4:r.hotHashData=e.string();break;case 5:r.coldHashData=e.string();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.coldConfigGroup&&lr.internalBinaryWrite(e.coldConfigGroup,t.tag(6,f.LengthDelimited).fork(),n).join(),e.hotConfigGroup&&cr.internalBinaryWrite(e.hotConfigGroup,t.tag(7,f.LengthDelimited).fork(),n).join(),e.hotHashData!==void 0&&t.tag(4,f.LengthDelimited).string(e.hotHashData),e.coldHashData!==void 0&&t.tag(5,f.LengthDelimited).string(e.coldHashData);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},sr=new yr,hr=class extends m{constructor(){super("youtube.response.config.ColdConfigGroup",[])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){return i??this.create()}internalBinaryWrite(e,t,n){let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},lr=new hr,mr=class extends m{constructor(){super("youtube.response.config.HotConfigGroup",[{no:138536474,name:"mediaHotConfig",kind:"message",T:()=>ur}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 138536474:r.mediaHotConfig=ur.internalBinaryRead(e,e.uint32(),n,r.mediaHotConfig);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.mediaHotConfig&&ur.internalBinaryWrite(e.mediaHotConfig,t.tag(138536474,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},cr=new mr,gr=class extends m{constructor(){super("youtube.response.config.MediaHotConfig",[{no:146311580,name:"onesieHotConfig",kind:"message",T:()=>fr}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 146311580:r.onesieHotConfig=fr.internalBinaryRead(e,e.uint32(),n,r.onesieHotConfig);break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.onesieHotConfig&&fr.internalBinaryWrite(e.onesieHotConfig,t.tag(146311580,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},ur=new gr,br=class extends m{constructor(){super("youtube.response.config.OnesieHotConfig",[{no:1,name:"clientKey",kind:"scalar",T:12},{no:2,name:"encryptKey",kind:"scalar",T:12},{no:3,name:"keyExpiresInSeconds",kind:"scalar",T:3},{no:30,name:"useHotConfigToCreateOnesieRequest",kind:"scalar",T:8}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.clientKey=new Uint8Array(0),t.encryptKey=new Uint8Array(0),t.keyExpiresInSeconds="0",t.useHotConfigToCreateOnesieRequest=!1,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.clientKey=e.bytes();break;case 2:r.encryptKey=e.bytes();break;case 3:r.keyExpiresInSeconds=e.int64().toString();break;case 30:r.useHotConfigToCreateOnesieRequest=e.bool();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.clientKey.length&&t.tag(1,f.LengthDelimited).bytes(e.clientKey),e.encryptKey.length&&t.tag(2,f.LengthDelimited).bytes(e.encryptKey),e.keyExpiresInSeconds!=="0"&&t.tag(3,f.Varint).int64(e.keyExpiresInSeconds),e.useHotConfigToCreateOnesieRequest!==!1&&t.tag(30,f.Varint).bool(e.useHotConfigToCreateOnesieRequest);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},fr=new br;var Ml=g(h(),1);var yl=g(h(),1);var ml=g(h(),1);var Bl=g(h(),1);var ti=(n=>(n[n.NONE=0]="NONE",n[n.GZIP=1]="GZIP",n[n.BROTLI=2]="BROTLI",n))(ti||{}),Rr=class extends m{constructor(){super("youtube.ump.encrypted.EncryptedInnertubeResponsePart",[{no:1,name:"encryptedContent",kind:"scalar",T:12},{no:2,name:"hmac",kind:"scalar",T:12},{no:3,name:"iv",kind:"scalar",T:12},{no:4,name:"compressionAlgorithm",kind:"enum",T:()=>["youtube.ump.encrypted.CompressionAlgorithm",ti]}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.encryptedContent=new Uint8Array(0),t.hmac=new Uint8Array(0),t.iv=new Uint8Array(0),t.compressionAlgorithm=0,e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 1:r.encryptedContent=e.bytes();break;case 2:r.hmac=e.bytes();break;case 3:r.iv=e.bytes();break;case 4:r.compressionAlgorithm=e.int32();break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){e.encryptedContent.length&&t.tag(1,f.LengthDelimited).bytes(e.encryptedContent),e.hmac.length&&t.tag(2,f.LengthDelimited).bytes(e.hmac),e.iv.length&&t.tag(3,f.LengthDelimited).bytes(e.iv),e.compressionAlgorithm!==0&&t.tag(4,f.Varint).int32(e.compressionAlgorithm);let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},xi=new Rr;var Sl=g(h(),1);var wr=class extends m{constructor(){super("youtube.ump.encrypted.OnesieInnertubeResponse",[{no:4,name:"contents",kind:"message",repeat:1,T:()=>Z}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.contents=[],e!==void 0&&y(this,t,e),t}internalBinaryRead(e,t,n,i){let r=i??this.create(),c=e.pos+t;for(;e.pos<c;){let[o,s]=e.tag();switch(o){case 4:r.contents.push(Z.internalBinaryRead(e,e.uint32(),n));break;default:let a=n.readUnknownField;if(a==="throw")throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);let u=e.skip(s);a!==!1&&(a===!0?d.onRead:a)(this.typeName,r,o,s,u)}}return r}internalBinaryWrite(e,t,n){for(let r=0;r<e.contents.length;r++)Z.internalBinaryWrite(e.contents[r],t.tag(4,f.LengthDelimited).fork(),n).join();let i=n.writeUnknownFields;return i!==!1&&(i==!0?d.onWrite:i)(this.typeName,e,t),t}},Wi=new wr;function Ni(l){l.adPlacements?.length&&(l.adPlacements.length=0),l.adSlots?.length&&(l.adSlots.length=0),delete l?.playbackTracking?.pageadViewthroughconversion}function Si(l){let e=l.playabilityStatus;e.pictureInPictureRender=me.create({pictureInPictureAbility:{active:!0,f4:0,f6:0,f8:1}}),e.backgroundPlayerRender=ge.create({backgroundAbility:{active:!0}})}function ce(l,e,t){let n=l!=null&&typeof l=="object"?[l]:[];for(;n.length;){let i=n.pop();for(let r of Object.keys(i)){if(r===e&&t(i))return;i[r]!=null&&typeof i[r]=="object"&&n.push(i[r])}}}var Oi={de:"Deutsch",ru:"\u0420\u0443\u0441\u0441\u043A\u0438\u0439",fr:"Fran\xE7ais",fil:"Filipino",ko:"\uD55C\uAD6D\uC5B4",ja:"\u65E5\u672C\u8A9E",en:"English",vi:"Ti\u1EBFng Vi\u1EC7t","zh-Hant":"\u4E2D\u6587\uFF08\u7E41\u9AD4\uFF09","zh-Hans":"\u4E2D\u6587\uFF08\u7B80\u4F53\uFF09",und:"@VirgilClyne"};function Pi(l,e){e!=="off"&&ce(l,"captionTracks",t=>{let n=t.captionTracks,i=t.audioTracks;if(Array.isArray(n)){let r={[e]:2,en:1},c=-1,o=0;for(let s=0;s<n.length;s++){let a=n[s],u=r[a.languageCode];u&&u>c&&(c=u,o=s),a.isTranslatable=!0}if(c!==2){let s=be.create({baseUrl:n[o].baseUrl+`&tlang=${e}`,name:{runs:[{text:`@Enhance (${e})`}]},vssId:`.${e}`,languageCode:e});n.push(s)}if(Array.isArray(i)){let s=c===2?o:n.length-1;for(let a of i)a.captionTrackIndices?.includes(s)||a.captionTrackIndices.push(s),a.defaultCaptionTrackIndex=s,a.captionsInitialState=3}}return t.translationLanguages=Object.entries(Oi).map(([r,c])=>ke.create({languageCode:r,languageName:{runs:[{text:c}]}})),!0})}function Br(l,e){Ni(l),Si(l),Pi(l,e)}function ni(l){if(l.length<1e3)return!1;let e=[112,97,103,101,97,100],t=l.length,n=e.length,i=new Int32Array(256).fill(n+1);for(let c=0;c<n;c++)i[e[c]]=n-c;let r=0;for(;r<=t-n;){if(l[r]===e[0]&&l[r+1]===e[1]&&l[r+2]===e[2]&&l[r+3]===e[3]&&l[r+4]===e[4]&&l[r+5]===e[5])return!0;r+=i[l[r+n]]||n+1}return!1}function Ui(l){return l?d.list(l)?.some(t=>ni(t.data))??!1:!1}function Ei(l,e){let t=l.no;if(e.whiteNo.includes(t))return!1;if(e.blackNo.includes(t))return!0;let n=ni(l.data);return n?e.blackNo.push(t):e.whiteNo.push(t),e.dirty=!0,n}function Fi(l,e){let t=!1;return ce(l,"renderInfo",n=>{let i=n.renderInfo?.layoutRender?.eml?.split("|")?.[0]??"";if(e.whiteEml.includes(i))t=!1;else if(e.blackEml.includes(i)||/shorts(?!_pivot_item)/.test(i))t=!0;else{let r=n?.videoInfo?.videoContext?.videoContent;r&&(t=Ui(r),t?e.blackEml.push(i):e.whiteEml.push(i),e.dirty=!0)}return!0}),t}function Li(l,e){let t=d.list(l)[0];return t?Ei(t,e):Fi(l,e)}function Ir(l,e){let t=!1;return ce(l,"richItemContents",n=>{let i=n.richItemContents;if(!Array.isArray(i))return!1;for(let r=i.length-1;r>=0;r--)Li(i[r],e)&&(i.splice(r,1),t=!0)}),t}function Tr(l,{state:e}){return{bodyChanged:Ir(l,e.adCache),stateChanged:e.adCache.dirty}}function Ai(l,{params:e}){return Br(l,e.captionLang),{bodyChanged:!0,stateChanged:!1}}function Di(l){let e=!1,t=l.entries?.length??0;for(let n=t-1;n>=0;n--)l.entries[n].command?.reelWatchEndpoint?.adClientParams?.isAd&&(l.entries.splice(n,1),e=!0);return{bodyChanged:e,stateChanged:!1}}function $i(l,{params:e}){let t=["SPunlimited"];e.blockUpload&&t.push("FEuploads"),e.blockImmersive&&t.push("FEmusic_immersive"),e.blockShorts&&t.push("FEshorts");let n=!1;return ce(l,"rendererItems",i=>{for(let r=i.rendererItems.length-1;r>=0;r--){let c=i.rendererItems[r]?.iconRender?.browseId??i.rendererItems[r]?.labelRender?.browseId;c&&t.includes(c)&&(i.rendererItems.splice(r,1),n=!0)}}),{bodyChanged:n,stateChanged:!1}}function ji(l){return ce(l.settingItems,"categoryId",e=>{e.categoryId===10135&&e.subSettings.push(Re.create({settingBooleanRenderer:{itemId:0,enableServiceEndpoint:{setClientSettingEndpoint:{settingData:{clientSettingEnum:{item:151},boolValue:!0}}},disableServiceEndpoint:{setClientSettingEndpoint:{settingData:{clientSettingEnum:{item:151},boolValue:!1}}}}}))}),l.settingItems.push(_.create({backgroundPlayBackSettingRenderer:{backgroundPlayback:!0,download:!0,downloadQualitySelection:!0,smartDownload:!0,icon:{iconType:1093}}})),{bodyChanged:!0,stateChanged:!1}}function Vi(l,{params:e,state:t}){for(let n of l.contents)n.player&&Br(n.player,e.captionLang),n.next&&Ir(n.next,t.adCache);return{bodyChanged:l.contents.length>0,stateChanged:t.adCache.dirty}}function ri(l,{state:e,platformKey:t}){let n=l.responseContext?.globalConfigGroup?.hotConfigGroup?.mediaHotConfig?.onesieHotConfig;if(!n)return{bodyChanged:!1,stateChanged:!1};let i=n.clientKey,r=n.encryptKey;if(!i?.length||!r?.length)return console.log("\u5F02\u5E38\uFF1AhotConfig \u672A\u5305\u542B\u5B8C\u6574\u7684 onesie key"),{bodyChanged:!1,stateChanged:!1};let c=Q(i),o=Q(r),s=e.config[t];return s?.clientKey===c&&s?.encryptKey===o?{bodyChanged:!1,stateChanged:!1}:(e.config[t]={clientKey:c,encryptKey:o},{bodyChanged:!1,stateChanged:!0})}var Mi=[{path:"browse",msgType:qr,handler:Tr},{path:"next",msgType:re,handler:Tr},{path:"player",msgType:oe,handler:Ai},{path:"search",msgType:Yr,handler:Tr},{path:"reel_watch_sequence",msgType:zr,handler:Di},{path:"guide",msgType:Zr,handler:$i},{path:"get_setting",msgType:Qr,handler:ji},{path:"get_watch",msgType:ei,handler:Vi},{path:"config",msgType:kr,handler:ri},{path:"log_event",msgType:kr,handler:ri}];function ii(l){let e=Mi.find(r=>l.url.includes(r.path));if(!e)return null;if(l.bodyBytes==null)return{action:"exit",state:l.state,changed:!1};let t=e.msgType.fromBinary(l.bodyBytes),{bodyChanged:n,stateChanged:i}=e.handler(t,{params:l.params,state:l.state,platformKey:l.platformKey});return{action:n?"body":"exit",bodyBytes:n?e.msgType.toBinary(t):void 0,state:l.state,changed:i}}var uc=g(h(),1);var rc=g(h(),1);var ue=class{_times=new Map;name;isDebug;className;request;response;constructor(e,t,n){this.name=e??"",this.isDebug=n?.debug??!1,e&&this.debug(`${e} Start`),this.className=t??"",this.init()}static getInstance(e,t){let n="Surge";return typeof $loon<"u"?n="Loon":typeof $task<"u"&&(n="QuanX"),ue.instances[n]||(ue.instances[n]=ue.classNames[n](e,n,t)),ue.instances[n]}createProxy(e){return new Proxy(e,{get:this.getFn,set:this.setFn})}getFn(e,t,n){return e[t]}setFn(e,t,n,i){return e[t]=n,!0}getJSON(e,t={}){let n=this.getVal(e);return n?JSON.parse(n):t}setJSON(e,t){this.setVal(JSON.stringify(e),t)}msg(e=this.name,t="",n="",i){}debug(e){this.isDebug&&(typeof e=="object"&&(e=JSON.stringify(e)),console.log(e))}log(e){typeof e=="object"&&(e=JSON.stringify(e)),console.log(e)}timeStart(e){this._times.set(e,Date.now())}timeEnd(e){if(this._times.has(e)){let t=this._times.get(e)??0,n=Date.now()-t;this.debug(`${e}: ${n}ms`),this._times.delete(e)}else this.debug(`Timer with label ${e} does not exist.`)}exit(){$done({})}reject(){$done()}decodeParams(e){return e}},K=ue;pe(K,"instances",{}),pe(K,"classNames",{QuanX:(e,t,n)=>new je(e,t,n),Surge:(e,t,n)=>new we(e,t,n),Loon:(e,t,n)=>new Cr(e,t,n)});var Ve=class extends K{getFn(e,t,n){let i=Ve.clientAdapter[t]||t;return super.getFn(e,i,n)}setFn(e,t,n,i){let r=Ve.clientAdapter[t]||t;return super.setFn(e,r,n,i)}init(){try{this.request=this.createProxy($request),this.response=this.createProxy($response)}catch(e){this.debug(e.toString())}}getVal(e){return $persistentStore.read(e)}setVal(e,t){$persistentStore.write(e,t)}msg(e=this.name,t="",n="",i){let r={};i&&(r={action:{"open-url":i}}),$notification.post(e,t,n,r)}async fetch(e){return await new Promise((t,n)=>{let{method:i,body:r,bodyBytes:c,...o}=e,s=c??r,a=s instanceof Uint8Array;$httpClient[i.toLowerCase()]({...o,body:s,"binary-mode":a},(u,B,w)=>{u&&n(u);let b=a?"bodyBytes":"body";t({status:B.status??B.statusCode,headers:B.headers,[b]:w})})})}done(e){let t=e.response??e;t.bodyBytes&&(t.body=t.bodyBytes,delete t.bodyBytes),$done(e.response?{response:t}:t)}decodeParams(e){return typeof $argument=="string"&&!$argument.includes("{{{")&&Object.assign(e,JSON.parse($argument)),e}},we=Ve;pe(we,"clientAdapter",{bodyBytes:"body"});var G=class extends K{static transferBodyBytes(e,t){return e instanceof ArrayBuffer?t==="Uint8Array"?new Uint8Array(e):e:e instanceof Uint8Array&&t==="ArrayBuffer"?e.buffer.slice(e.byteOffset,e.byteLength+e.byteOffset):e}init(){try{this.request=this.createProxy($request),this.response=this.createProxy($response)}catch(e){this.debug(e.toString())}}getFn(e,t,n){let i=G.clientAdapter[t]||t,r=super.getFn(e,i,n);return t==="bodyBytes"&&(r=G.transferBodyBytes(r,"Uint8Array")),r}setFn(e,t,n,i){let r=G.clientAdapter[t]||t,c=n;return t==="bodyBytes"&&(c=G.transferBodyBytes(c,"Uint8Array")),super.setFn(e,r,c,i)}getVal(e){return $prefs.valueForKey(e)}setVal(e,t){$prefs.setValueForKey(e,t)}msg(e=this.name,t="",n="",i){$notify(e,t,n,{"open-url":i??""})}async fetch(e){return await new Promise(t=>{let n={url:"",method:"GET"};for(let[i,r]of Object.entries(e))i==="id"?n.sessionIndex=r:i==="bodyBytes"?n.bodyBytes=G.transferBodyBytes(r,"ArrayBuffer"):n[i]=r;e.bodyBytes&&delete n.body,$task.fetch(n).then(i=>{let r={status:200,headers:{}};for(let[c,o]of Object.entries(i))c==="sessionIndex"?r.id=o:c==="bodyBytes"?r.bodyBytes=G.transferBodyBytes(o,"Uint8Array"):c==="statusCode"?r.status=o:r[c]=o;t(r)})})}done(e){let t=e.response??e,n={};for(let[i,r]of Object.entries(t))i==="status"?n.status=`HTTP/1.1 ${r}`:i==="bodyBytes"?n.bodyBytes=G.transferBodyBytes(r,"ArrayBuffer"):n[i]=r;$done(n)}},je=G;pe(je,"clientAdapter",{id:"sessionIndex",status:"statusCode"});var Cr=class extends we{decodeParams(e){if(typeof $argument<"u")for(let t of Object.keys(e)){let n=$argument?.[t];n!==void 0&&(e[t]=n)}return e}};var oc=g(h(),1),fe={config:"YouTubeConfig",advertiseInfo:"YouTubeAdvertiseInfo"},xr={music:"youtubeMusic",video:"youtube"};var F=K.getInstance("YouTube");function vi(){return(F.request.headers["user-agent"]??F.request.headers["User-Agent"]).includes("music")}function Wr(){return vi()?xr.music:xr.video}var pc=g(h(),1);function ai(){return F.decodeParams({captionLang:"off",blockUpload:!0,blockImmersive:!0,blockShorts:!1})}var gc=g(h(),1);var oi="1.0";function Gi(){return{whiteNo:[],blackNo:[],whiteEml:[],blackEml:["inline_injection_entrypoint_layout.eml"],dirty:!1}}function si(){let l=F.getJSON(fe.advertiseInfo);return l?.version!==oi?Gi():{whiteNo:l.whiteNo,blackNo:l.blackNo,whiteEml:l.whiteEml,blackEml:l.blackEml,dirty:!1}}function li(l){if(!l.dirty)return;let{whiteNo:e,blackNo:t,whiteEml:n,blackEml:i}=l,r={version:oi,whiteNo:e,blackNo:t,whiteEml:n,blackEml:i};F.setJSON(r,fe.advertiseInfo)}var wc=g(h(),1);function ci(){return F.getJSON(fe.config)??{}}function ui(l){F.debug(`saveKeyConfig: ${JSON.stringify(l)}`),F.setJSON(l,fe.config)}function Ki(){let l={adCache:si(),config:ci()},e=ii({url:F.request.url,bodyBytes:F.response.bodyBytes,state:l,params:ai(),platformKey:Wr()});if(e==null){F.msg("YouTube Enhance","\u811A\u672C\u9700\u8981\u66F4\u65B0","\u5916\u90E8\u8D44\u6E90 -> \u5168\u90E8\u66F4\u65B0"),F.exit();return}e.changed&&(li(e.state.adCache),ui(e.state.config)),e.action==="body"&&e.bodyBytes?F.done({bodyBytes:e.bodyBytes}):F.exit()}try{Ki()}catch(l){console.log(String(l)),F.exit()}})();

}
function runYouTubeRequest($done, $argument, $request, $response) {
// Build: 2026/7/12 22:44:32
(()=>{var nt=Object.create;var ge=Object.defineProperty;var it=Object.getOwnPropertyDescriptor;var st=Object.getOwnPropertyNames;var ot=Object.getPrototypeOf,at=Object.prototype.hasOwnProperty;var ft=(n,e,t)=>e in n?ge(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var ut=(n,e)=>()=>(e||n((e={exports:{}}).exports,e),e.exports);var ct=(n,e,t,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of st(e))!at.call(n,i)&&i!==t&&ge(n,i,{get:()=>e[i],enumerable:!(r=it(e,i))||r.enumerable});return n};var h=(n,e,t)=>(t=n!=null?nt(ot(n)):{},ct(e||!n||!n.__esModule?ge(t,"default",{value:n,enumerable:!0}):t,n));var Y=(n,e,t)=>(ft(n,typeof e!="symbol"?e+"":e,t),t);var l=ut(Ae=>{"use strict";(function(n){function e(){}function t(){}var r=String.fromCharCode,i={}.toString,s=i.call(n.SharedArrayBuffer),o=i(),a=n.Uint8Array,u=a||Array,c=a?ArrayBuffer:u,d=c.isView||function(w){return w&&"length"in w},I=i.call(c.prototype);c=t.prototype;var y=n.TextEncoder,m=new(a?Uint16Array:u)(32);e.prototype.decode=function(w){if(!d(w)){var U=i.call(w);if(U!==I&&U!==s&&U!==o)throw TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");w=a?new u(w):w||[]}for(var x=U="",p=0,k=w.length|0,G=k-32|0,B,T,A=0,J=0,K,V=0,L=-1;p<k;){for(B=p<=G?32:k-p|0;V<B;p=p+1|0,V=V+1|0){switch(T=w[p]&255,T>>4){case 15:if(K=w[p=p+1|0]&255,K>>6!==2||247<T){p=p-1|0;break}A=(T&7)<<6|K&63,J=5,T=256;case 14:K=w[p=p+1|0]&255,A<<=6,A|=(T&15)<<6|K&63,J=K>>6===2?J+4|0:24,T=T+256&768;case 13:case 12:K=w[p=p+1|0]&255,A<<=6,A|=(T&31)<<6|K&63,J=J+7|0,p<k&&K>>6===2&&A>>J&&1114112>A?(T=A,A=A-65536|0,0<=A&&(L=(A>>10)+55296|0,T=(A&1023)+56320|0,31>V?(m[V]=L,V=V+1|0,L=-1):(K=L,L=T,T=K))):(T>>=8,p=p-T-1|0,T=65533),A=J=0,B=p<=G?32:k-p|0;default:m[V]=T;continue;case 11:case 10:case 9:case 8:}m[V]=65533}if(x+=r(m[0],m[1],m[2],m[3],m[4],m[5],m[6],m[7],m[8],m[9],m[10],m[11],m[12],m[13],m[14],m[15],m[16],m[17],m[18],m[19],m[20],m[21],m[22],m[23],m[24],m[25],m[26],m[27],m[28],m[29],m[30],m[31]),32>V&&(x=x.slice(0,V-32|0)),p<k){if(m[0]=L,V=~L>>>31,L=-1,x.length<U.length)continue}else L!==-1&&(x+=r(L));U+=x,x=""}return U},c.encode=function(w){w=w===void 0?"":""+w;var U=w.length|0,x=new u((U<<1)+8|0),p,k=0,G=!a;for(p=0;p<U;p=p+1|0,k=k+1|0){var B=w.charCodeAt(p)|0;if(127>=B)x[k]=B;else{if(2047>=B)x[k]=192|B>>6;else{e:{if(55296<=B)if(56319>=B){var T=w.charCodeAt(p=p+1|0)|0;if(56320<=T&&57343>=T){if(B=(B<<10)+T-56613888|0,65535<B){x[k]=240|B>>18,x[k=k+1|0]=128|B>>12&63,x[k=k+1|0]=128|B>>6&63,x[k=k+1|0]=128|B&63;continue}break e}B=65533}else 57343>=B&&(B=65533);!G&&p<<1<k&&p<<1<(k-7|0)&&(G=!0,T=new u(3*U),T.set(x),x=T)}x[k]=224|B>>12,x[k=k+1|0]=128|B>>6&63}x[k=k+1|0]=128|B&63}}return a?x.subarray(0,k):x.slice(0,k)},y||(n.TextDecoder=e,n.TextEncoder=t)})(""+void 0==typeof global?""+void 0==typeof globalThis?Ae:globalThis:global)});var ni=h(l(),1);var Kn=h(l(),1);var Nn=h(l());var At=h(l());function Q(n){let e=typeof n;if(e=="object"){if(Array.isArray(n))return"array";if(n===null)return"null"}return e}function Se(n){return n!==null&&typeof n=="object"&&!Array.isArray(n)}var Ut=h(l()),C="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(""),ee=[];for(let n=0;n<C.length;n++)ee[C[n].charCodeAt(0)]=n;ee["-".charCodeAt(0)]=C.indexOf("+");ee["_".charCodeAt(0)]=C.indexOf("/");function Z(n){let e=n.length*3/4;n[n.length-2]=="="?e-=2:n[n.length-1]=="="&&(e-=1);let t=new Uint8Array(e),r=0,i=0,s,o=0;for(let a=0;a<n.length;a++){if(s=ee[n.charCodeAt(a)],s===void 0)switch(n[a]){case"=":i=0;case`
`:case"\r":case"	":case" ":continue;default:throw Error("invalid base64 string.")}switch(i){case 0:o=s,i=1;break;case 1:t[r++]=o<<2|(s&48)>>4,o=s,i=2;break;case 2:t[r++]=(o&15)<<4|(s&60)>>2,o=s,i=3;break;case 3:t[r++]=(o&3)<<6|s,i=0;break}}if(i==1)throw Error("invalid base64 string.");return t.subarray(0,r)}function ye(n){let e="",t=0,r,i=0;for(let s=0;s<n.length;s++)switch(r=n[s],t){case 0:e+=C[r>>2],i=(r&3)<<4,t=1;break;case 1:e+=C[i|r>>4],i=(r&15)<<2,t=2;break;case 2:e+=C[i|r>>6],e+=C[r&63],t=0;break}return t&&(e+=C[i],e+="=",t==1&&(e+="=")),e}var Dt=h(l()),D;(function(n){n.symbol=Symbol.for("protobuf-ts/unknown"),n.onRead=(t,r,i,s,o)=>{(e(r)?r[n.symbol]:r[n.symbol]=[]).push({no:i,wireType:s,data:o})},n.onWrite=(t,r,i)=>{for(let{no:s,wireType:o,data:a}of n.list(r))i.tag(s,o).raw(a)},n.list=(t,r)=>{if(e(t)){let i=t[n.symbol];return r?i.filter(s=>s.no==r):i}return[]},n.last=(t,r)=>n.list(t,r).slice(-1)[0];let e=t=>t&&Array.isArray(t[n.symbol])})(D||(D={}));var b;(function(n){n[n.Varint=0]="Varint",n[n.Bit64=1]="Bit64",n[n.LengthDelimited=2]="LengthDelimited",n[n.StartGroup=3]="StartGroup",n[n.EndGroup=4]="EndGroup",n[n.Bit32=5]="Bit32"})(b||(b={}));var Xt=h(l());var $t=h(l());var Lt=h(l());function Ue(){let n=0,e=0;for(let r=0;r<28;r+=7){let i=this.buf[this.pos++];if(n|=(i&127)<<r,!(i&128))return this.assertBounds(),[n,e]}let t=this.buf[this.pos++];if(n|=(t&15)<<28,e=(t&112)>>4,!(t&128))return this.assertBounds(),[n,e];for(let r=3;r<=31;r+=7){let i=this.buf[this.pos++];if(e|=(i&127)<<r,!(i&128))return this.assertBounds(),[n,e]}throw new Error("invalid varint")}function re(n,e,t){for(let s=0;s<28;s=s+7){let o=n>>>s,a=!(!(o>>>7)&&e==0),u=(a?o|128:o)&255;if(t.push(u),!a)return}let r=n>>>28&15|(e&7)<<4,i=!!(e>>3);if(t.push((i?r|128:r)&255),!!i){for(let s=3;s<31;s=s+7){let o=e>>>s,a=!!(o>>>7),u=(a?o|128:o)&255;if(t.push(u),!a)return}t.push(e>>>31&1)}}var te=(1<<16)*(1<<16);function be(n){let e=n[0]=="-";e&&(n=n.slice(1));let t=1e6,r=0,i=0;function s(o,a){let u=Number(n.slice(o,a));i*=t,r=r*t+u,r>=te&&(i=i+(r/te|0),r=r%te)}return s(-24,-18),s(-18,-12),s(-12,-6),s(-6),[e,r,i]}function ne(n,e){if(e>>>0<=2097151)return""+(te*e+(n>>>0));let t=n&16777215,r=(n>>>24|e<<8)>>>0&16777215,i=e>>16&65535,s=t+r*6777216+i*6710656,o=r+i*8147497,a=i*2,u=1e7;s>=u&&(o+=Math.floor(s/u),s%=u),o>=u&&(a+=Math.floor(o/u),o%=u);function c(d,I){let y=d?String(d):"";return I?"0000000".slice(y.length)+y:y}return c(a,0)+c(o,a)+c(s,1)}function we(n,e){if(n>=0){for(;n>127;)e.push(n&127|128),n=n>>>7;e.push(n)}else{for(let t=0;t<9;t++)e.push(n&127|128),n=n>>7;e.push(1)}}function Ve(){let n=this.buf[this.pos++],e=n&127;if(!(n&128))return this.assertBounds(),e;if(n=this.buf[this.pos++],e|=(n&127)<<7,!(n&128))return this.assertBounds(),e;if(n=this.buf[this.pos++],e|=(n&127)<<14,!(n&128))return this.assertBounds(),e;if(n=this.buf[this.pos++],e|=(n&127)<<21,!(n&128))return this.assertBounds(),e;n=this.buf[this.pos++],e|=(n&15)<<28;for(let t=5;n&128&&t<10;t++)n=this.buf[this.pos++];if(n&128)throw new Error("invalid varint");return this.assertBounds(),e>>>0}var O;function lt(){let n=new DataView(new ArrayBuffer(8));O=globalThis.BigInt!==void 0&&typeof n.getBigInt64=="function"&&typeof n.getBigUint64=="function"&&typeof n.setBigInt64=="function"&&typeof n.setBigUint64=="function"?{MIN:BigInt("-9223372036854775808"),MAX:BigInt("9223372036854775807"),UMIN:BigInt("0"),UMAX:BigInt("18446744073709551615"),C:BigInt,V:n}:void 0}lt();function De(n){if(!n)throw new Error("BigInt unavailable, see https://github.com/timostamm/protobuf-ts/blob/v1.0.8/MANUAL.md#bigint-support")}var Ke=/^-?[0-9]+$/,se=4294967296,ie=2147483648,oe=class{constructor(e,t){this.lo=e|0,this.hi=t|0}isZero(){return this.lo==0&&this.hi==0}toNumber(){let e=this.hi*se+(this.lo>>>0);if(!Number.isSafeInteger(e))throw new Error("cannot convert to safe number");return e}},E=class extends oe{static from(e){if(O)switch(typeof e){case"string":if(e=="0")return this.ZERO;if(e=="")throw new Error("string is no integer");e=O.C(e);case"number":if(e===0)return this.ZERO;e=O.C(e);case"bigint":if(!e)return this.ZERO;if(e<O.UMIN)throw new Error("signed value for ulong");if(e>O.UMAX)throw new Error("ulong too large");return O.V.setBigUint64(0,e,!0),new E(O.V.getInt32(0,!0),O.V.getInt32(4,!0))}else switch(typeof e){case"string":if(e=="0")return this.ZERO;if(e=e.trim(),!Ke.test(e))throw new Error("string is no integer");let[t,r,i]=be(e);if(t)throw new Error("signed value for ulong");return new E(r,i);case"number":if(e==0)return this.ZERO;if(!Number.isSafeInteger(e))throw new Error("number is no integer");if(e<0)throw new Error("signed value for ulong");return new E(e,e/se)}throw new Error("unknown value "+typeof e)}toString(){return O?this.toBigInt().toString():ne(this.lo,this.hi)}toBigInt(){return De(O),O.V.setInt32(0,this.lo,!0),O.V.setInt32(4,this.hi,!0),O.V.getBigUint64(0,!0)}};E.ZERO=new E(0,0);var N=class extends oe{static from(e){if(O)switch(typeof e){case"string":if(e=="0")return this.ZERO;if(e=="")throw new Error("string is no integer");e=O.C(e);case"number":if(e===0)return this.ZERO;e=O.C(e);case"bigint":if(!e)return this.ZERO;if(e<O.MIN)throw new Error("signed long too small");if(e>O.MAX)throw new Error("signed long too large");return O.V.setBigInt64(0,e,!0),new N(O.V.getInt32(0,!0),O.V.getInt32(4,!0))}else switch(typeof e){case"string":if(e=="0")return this.ZERO;if(e=e.trim(),!Ke.test(e))throw new Error("string is no integer");let[t,r,i]=be(e);if(t){if(i>ie||i==ie&&r!=0)throw new Error("signed long too small")}else if(i>=ie)throw new Error("signed long too large");let s=new N(r,i);return t?s.negate():s;case"number":if(e==0)return this.ZERO;if(!Number.isSafeInteger(e))throw new Error("number is no integer");return e>0?new N(e,e/se):new N(-e,-e/se).negate()}throw new Error("unknown value "+typeof e)}isNegative(){return(this.hi&ie)!==0}negate(){let e=~this.hi,t=this.lo;return t?t=~t+1:e+=1,new N(t,e)}toString(){if(O)return this.toBigInt().toString();if(this.isNegative()){let e=this.negate();return"-"+ne(e.lo,e.hi)}return ne(this.lo,this.hi)}toBigInt(){return De(O),O.V.setInt32(0,this.lo,!0),O.V.setInt32(4,this.hi,!0),O.V.getBigInt64(0,!0)}};N.ZERO=new N(0,0);var Le={readUnknownField:!0,readerFactory:n=>new Ie(n)};function Ce(n){return n?Object.assign(Object.assign({},Le),n):Le}var Ie=class{constructor(e,t){this.varint64=Ue,this.uint32=Ve,this.buf=e,this.len=e.length,this.pos=0,this.view=new DataView(e.buffer,e.byteOffset,e.byteLength),this.textDecoder=t??new TextDecoder("utf-8",{fatal:!0,ignoreBOM:!0})}tag(){let e=this.uint32(),t=e>>>3,r=e&7;if(t<=0||r<0||r>5)throw new Error("illegal tag: field no "+t+" wire type "+r);return[t,r]}skip(e){let t=this.pos;switch(e){case b.Varint:for(;this.buf[this.pos++]&128;);break;case b.Bit64:this.pos+=4;case b.Bit32:this.pos+=4;break;case b.LengthDelimited:let r=this.uint32();this.pos+=r;break;case b.StartGroup:let i;for(;(i=this.tag()[1])!==b.EndGroup;)this.skip(i);break;default:throw new Error("cant skip wire type "+e)}return this.assertBounds(),this.buf.subarray(t,this.pos)}assertBounds(){if(this.pos>this.len)throw new RangeError("premature EOF")}int32(){return this.uint32()|0}sint32(){let e=this.uint32();return e>>>1^-(e&1)}int64(){return new N(...this.varint64())}uint64(){return new E(...this.varint64())}sint64(){let[e,t]=this.varint64(),r=-(e&1);return e=(e>>>1|(t&1)<<31)^r,t=t>>>1^r,new N(e,t)}bool(){let[e,t]=this.varint64();return e!==0||t!==0}fixed32(){return this.view.getUint32((this.pos+=4)-4,!0)}sfixed32(){return this.view.getInt32((this.pos+=4)-4,!0)}fixed64(){return new E(this.sfixed32(),this.sfixed32())}sfixed64(){return new N(this.sfixed32(),this.sfixed32())}float(){return this.view.getFloat32((this.pos+=4)-4,!0)}double(){return this.view.getFloat64((this.pos+=8)-8,!0)}bytes(){let e=this.uint32(),t=this.pos;return this.pos+=e,this.assertBounds(),this.buf.subarray(t,t+e)}string(){return this.textDecoder.decode(this.bytes())}};var zt=h(l());var _t=h(l());function g(n,e){if(!n)throw new Error(e)}var ht=34028234663852886e22,mt=-34028234663852886e22,dt=4294967295,pt=2147483647,gt=-2147483648;function P(n){if(typeof n!="number")throw new Error("invalid int 32: "+typeof n);if(!Number.isInteger(n)||n>pt||n<gt)throw new Error("invalid int 32: "+n)}function j(n){if(typeof n!="number")throw new Error("invalid uint 32: "+typeof n);if(!Number.isInteger(n)||n>dt||n<0)throw new Error("invalid uint 32: "+n)}function X(n){if(typeof n!="number")throw new Error("invalid float 32: "+typeof n);if(Number.isFinite(n)&&(n>ht||n<mt))throw new Error("invalid float 32: "+n)}var qe={writeUnknownFields:!0,writerFactory:()=>new Ne};function $e(n){return n?Object.assign(Object.assign({},qe),n):qe}var Ne=class{constructor(e){this.stack=[],this.textEncoder=e??new TextEncoder,this.chunks=[],this.buf=[]}finish(){this.chunks.push(new Uint8Array(this.buf));let e=0;for(let i=0;i<this.chunks.length;i++)e+=this.chunks[i].length;let t=new Uint8Array(e),r=0;for(let i=0;i<this.chunks.length;i++)t.set(this.chunks[i],r),r+=this.chunks[i].length;return this.chunks=[],t}fork(){return this.stack.push({chunks:this.chunks,buf:this.buf}),this.chunks=[],this.buf=[],this}join(){let e=this.finish(),t=this.stack.pop();if(!t)throw new Error("invalid state, fork stack empty");return this.chunks=t.chunks,this.buf=t.buf,this.uint32(e.byteLength),this.raw(e)}tag(e,t){return this.uint32((e<<3|t)>>>0)}raw(e){return this.buf.length&&(this.chunks.push(new Uint8Array(this.buf)),this.buf=[]),this.chunks.push(e),this}uint32(e){for(j(e);e>127;)this.buf.push(e&127|128),e=e>>>7;return this.buf.push(e),this}int32(e){return P(e),we(e,this.buf),this}bool(e){return this.buf.push(e?1:0),this}bytes(e){return this.uint32(e.byteLength),this.raw(e)}string(e){let t=this.textEncoder.encode(e);return this.uint32(t.byteLength),this.raw(t)}float(e){X(e);let t=new Uint8Array(4);return new DataView(t.buffer).setFloat32(0,e,!0),this.raw(t)}double(e){let t=new Uint8Array(8);return new DataView(t.buffer).setFloat64(0,e,!0),this.raw(t)}fixed32(e){j(e);let t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e,!0),this.raw(t)}sfixed32(e){P(e);let t=new Uint8Array(4);return new DataView(t.buffer).setInt32(0,e,!0),this.raw(t)}sint32(e){return P(e),e=(e<<1^e>>31)>>>0,we(e,this.buf),this}sfixed64(e){let t=new Uint8Array(8),r=new DataView(t.buffer),i=N.from(e);return r.setInt32(0,i.lo,!0),r.setInt32(4,i.hi,!0),this.raw(t)}fixed64(e){let t=new Uint8Array(8),r=new DataView(t.buffer),i=E.from(e);return r.setInt32(0,i.lo,!0),r.setInt32(4,i.hi,!0),this.raw(t)}int64(e){let t=N.from(e);return re(t.lo,t.hi,this.buf),this}sint64(e){let t=N.from(e),r=t.hi>>31,i=t.lo<<1^r,s=(t.hi<<1|t.lo>>>31)^r;return re(i,s,this.buf),this}uint64(e){let t=E.from(e);return re(t.lo,t.hi,this.buf),this}};var Qt=h(l()),Pe={emitDefaultValues:!1,enumAsInteger:!1,useProtoFieldName:!1,prettySpaces:0},Me={ignoreUnknownFields:!1};function Je(n){return n?Object.assign(Object.assign({},Me),n):Me}function je(n){return n?Object.assign(Object.assign({},Pe),n):Pe}var tr=h(l()),ae=Symbol.for("protobuf-ts/message-type");var bn=h(l());var or=h(l());var nr=h(l());function ke(n){let e=!1,t=[];for(let r=0;r<n.length;r++){let i=n.charAt(r);i=="_"?e=!0:/\d/.test(i)?(t.push(i),e=!0):e?(t.push(i.toUpperCase()),e=!1):r==0?t.push(i.toLowerCase()):t.push(i)}return t.join("")}var f;(function(n){n[n.DOUBLE=1]="DOUBLE",n[n.FLOAT=2]="FLOAT",n[n.INT64=3]="INT64",n[n.UINT64=4]="UINT64",n[n.INT32=5]="INT32",n[n.FIXED64=6]="FIXED64",n[n.FIXED32=7]="FIXED32",n[n.BOOL=8]="BOOL",n[n.STRING=9]="STRING",n[n.BYTES=12]="BYTES",n[n.UINT32=13]="UINT32",n[n.SFIXED32=15]="SFIXED32",n[n.SFIXED64=16]="SFIXED64",n[n.SINT32=17]="SINT32",n[n.SINT64=18]="SINT64"})(f||(f={}));var F;(function(n){n[n.BIGINT=0]="BIGINT",n[n.STRING=1]="STRING",n[n.NUMBER=2]="NUMBER"})(F||(F={}));var v;(function(n){n[n.NO=0]="NO",n[n.PACKED=1]="PACKED",n[n.UNPACKED=2]="UNPACKED"})(v||(v={}));function Xe(n){var e,t,r,i;return n.localName=(e=n.localName)!==null&&e!==void 0?e:ke(n.name),n.jsonName=(t=n.jsonName)!==null&&t!==void 0?t:ke(n.name),n.repeat=(r=n.repeat)!==null&&r!==void 0?r:v.NO,n.opt=(i=n.opt)!==null&&i!==void 0?i:n.repeat||n.oneof?!1:n.kind=="message",n}var hr=h(l());var fr=h(l());function We(n){if(typeof n!="object"||n===null||!n.hasOwnProperty("oneofKind"))return!1;switch(typeof n.oneofKind){case"string":return n[n.oneofKind]===void 0?!1:Object.keys(n).length==2;case"undefined":return Object.keys(n).length==1;default:return!1}}var fe=class{constructor(e){var t;this.fields=(t=e.fields)!==null&&t!==void 0?t:[]}prepare(){if(this.data)return;let e=[],t=[],r=[];for(let i of this.fields)if(i.oneof)r.includes(i.oneof)||(r.push(i.oneof),e.push(i.oneof),t.push(i.oneof));else switch(t.push(i.localName),i.kind){case"scalar":case"enum":(!i.opt||i.repeat)&&e.push(i.localName);break;case"message":i.repeat&&e.push(i.localName);break;case"map":e.push(i.localName);break}this.data={req:e,known:t,oneofs:Object.values(r)}}is(e,t,r=!1){if(t<0)return!0;if(e==null||typeof e!="object")return!1;this.prepare();let i=Object.keys(e),s=this.data;if(i.length<s.req.length||s.req.some(o=>!i.includes(o))||!r&&i.some(o=>!s.known.includes(o)))return!1;if(t<1)return!0;for(let o of s.oneofs){let a=e[o];if(!We(a))return!1;if(a.oneofKind===void 0)continue;let u=this.fields.find(c=>c.localName===a.oneofKind);if(!u||!this.field(a[a.oneofKind],u,r,t))return!1}for(let o of this.fields)if(o.oneof===void 0&&!this.field(e[o.localName],o,r,t))return!1;return!0}field(e,t,r,i){let s=t.repeat;switch(t.kind){case"scalar":return e===void 0?t.opt:s?this.scalars(e,t.T,i,t.L):this.scalar(e,t.T,t.L);case"enum":return e===void 0?t.opt:s?this.scalars(e,f.INT32,i):this.scalar(e,f.INT32);case"message":return e===void 0?!0:s?this.messages(e,t.T(),r,i):this.message(e,t.T(),r,i);case"map":if(typeof e!="object"||e===null)return!1;if(i<2)return!0;if(!this.mapKeys(e,t.K,i))return!1;switch(t.V.kind){case"scalar":return this.scalars(Object.values(e),t.V.T,i,t.V.L);case"enum":return this.scalars(Object.values(e),f.INT32,i);case"message":return this.messages(Object.values(e),t.V.T(),r,i)}break}return!0}message(e,t,r,i){return r?t.isAssignable(e,i):t.is(e,i)}messages(e,t,r,i){if(!Array.isArray(e))return!1;if(i<2)return!0;if(r){for(let s=0;s<e.length&&s<i;s++)if(!t.isAssignable(e[s],i-1))return!1}else for(let s=0;s<e.length&&s<i;s++)if(!t.is(e[s],i-1))return!1;return!0}scalar(e,t,r){let i=typeof e;switch(t){case f.UINT64:case f.FIXED64:case f.INT64:case f.SFIXED64:case f.SINT64:switch(r){case F.BIGINT:return i=="bigint";case F.NUMBER:return i=="number"&&!isNaN(e);default:return i=="string"}case f.BOOL:return i=="boolean";case f.STRING:return i=="string";case f.BYTES:return e instanceof Uint8Array;case f.DOUBLE:case f.FLOAT:return i=="number"&&!isNaN(e);default:return i=="number"&&Number.isInteger(e)}}scalars(e,t,r,i){if(!Array.isArray(e))return!1;if(r<2)return!0;if(Array.isArray(e)){for(let s=0;s<e.length&&s<r;s++)if(!this.scalar(e[s],t,i))return!1}return!0}mapKeys(e,t,r){let i=Object.keys(e);switch(t){case f.INT32:case f.FIXED32:case f.SFIXED32:case f.SINT32:case f.UINT32:return this.scalars(i.slice(0,r).map(s=>parseInt(s)),t,r);case f.BOOL:return this.scalars(i.slice(0,r).map(s=>s=="true"?!0:s=="false"?!1:s),t,r);default:return this.scalars(i,t,r,F.STRING)}}};var Or=h(l());var pr=h(l());function S(n,e){switch(e){case F.BIGINT:return n.toBigInt();case F.NUMBER:return n.toNumber();default:return n.toString()}}var ue=class{constructor(e){this.info=e}prepare(){var e;if(this.fMap===void 0){this.fMap={};let t=(e=this.info.fields)!==null&&e!==void 0?e:[];for(let r of t)this.fMap[r.name]=r,this.fMap[r.jsonName]=r,this.fMap[r.localName]=r}}assert(e,t,r){if(!e){let i=Q(r);throw(i=="number"||i=="boolean")&&(i=r.toString()),new Error(`Cannot parse JSON ${i} for ${this.info.typeName}#${t}`)}}read(e,t,r){this.prepare();let i=[];for(let[s,o]of Object.entries(e)){let a=this.fMap[s];if(!a){if(!r.ignoreUnknownFields)throw new Error(`Found unknown field while reading ${this.info.typeName} from JSON format. JSON key: ${s}`);continue}let u=a.localName,c;if(a.oneof){if(o===null&&(a.kind!=="enum"||a.T()[0]!=="google.protobuf.NullValue"))continue;if(i.includes(a.oneof))throw new Error(`Multiple members of the oneof group "${a.oneof}" of ${this.info.typeName} are present in JSON.`);i.push(a.oneof),c=t[a.oneof]={oneofKind:u}}else c=t;if(a.kind=="map"){if(o===null)continue;this.assert(Se(o),a.name,o);let d=c[u];for(let[I,y]of Object.entries(o)){this.assert(y!==null,a.name+" map value",null);let m;switch(a.V.kind){case"message":m=a.V.T().internalJsonRead(y,r);break;case"enum":if(m=this.enum(a.V.T(),y,a.name,r.ignoreUnknownFields),m===!1)continue;break;case"scalar":m=this.scalar(y,a.V.T,a.V.L,a.name);break}this.assert(m!==void 0,a.name+" map value",y);let w=I;a.K==f.BOOL&&(w=w=="true"?!0:w=="false"?!1:w),w=this.scalar(w,a.K,F.STRING,a.name).toString(),d[w]=m}}else if(a.repeat){if(o===null)continue;this.assert(Array.isArray(o),a.name,o);let d=c[u];for(let I of o){this.assert(I!==null,a.name,null);let y;switch(a.kind){case"message":y=a.T().internalJsonRead(I,r);break;case"enum":if(y=this.enum(a.T(),I,a.name,r.ignoreUnknownFields),y===!1)continue;break;case"scalar":y=this.scalar(I,a.T,a.L,a.name);break}this.assert(y!==void 0,a.name,o),d.push(y)}}else switch(a.kind){case"message":if(o===null&&a.T().typeName!="google.protobuf.Value"){this.assert(a.oneof===void 0,a.name+" (oneof member)",null);continue}c[u]=a.T().internalJsonRead(o,r,c[u]);break;case"enum":let d=this.enum(a.T(),o,a.name,r.ignoreUnknownFields);if(d===!1)continue;c[u]=d;break;case"scalar":c[u]=this.scalar(o,a.T,a.L,a.name);break}}}enum(e,t,r,i){if(e[0]=="google.protobuf.NullValue"&&g(t===null||t==="NULL_VALUE",`Unable to parse field ${this.info.typeName}#${r}, enum ${e[0]} only accepts null.`),t===null)return 0;switch(typeof t){case"number":return g(Number.isInteger(t),`Unable to parse field ${this.info.typeName}#${r}, enum can only be integral number, got ${t}.`),t;case"string":let s=t;e[2]&&t.substring(0,e[2].length)===e[2]&&(s=t.substring(e[2].length));let o=e[1][s];return typeof o>"u"&&i?!1:(g(typeof o=="number",`Unable to parse field ${this.info.typeName}#${r}, enum ${e[0]} has no value for "${t}".`),o)}g(!1,`Unable to parse field ${this.info.typeName}#${r}, cannot parse enum value from ${typeof t}".`)}scalar(e,t,r,i){let s;try{switch(t){case f.DOUBLE:case f.FLOAT:if(e===null)return 0;if(e==="NaN")return Number.NaN;if(e==="Infinity")return Number.POSITIVE_INFINITY;if(e==="-Infinity")return Number.NEGATIVE_INFINITY;if(e===""){s="empty string";break}if(typeof e=="string"&&e.trim().length!==e.length){s="extra whitespace";break}if(typeof e!="string"&&typeof e!="number")break;let o=Number(e);if(Number.isNaN(o)){s="not a number";break}if(!Number.isFinite(o)){s="too large or small";break}return t==f.FLOAT&&X(o),o;case f.INT32:case f.FIXED32:case f.SFIXED32:case f.SINT32:case f.UINT32:if(e===null)return 0;let a;if(typeof e=="number"?a=e:e===""?s="empty string":typeof e=="string"&&(e.trim().length!==e.length?s="extra whitespace":a=Number(e)),a===void 0)break;return t==f.UINT32?j(a):P(a),a;case f.INT64:case f.SFIXED64:case f.SINT64:if(e===null)return S(N.ZERO,r);if(typeof e!="number"&&typeof e!="string")break;return S(N.from(e),r);case f.FIXED64:case f.UINT64:if(e===null)return S(E.ZERO,r);if(typeof e!="number"&&typeof e!="string")break;return S(E.from(e),r);case f.BOOL:if(e===null)return!1;if(typeof e!="boolean")break;return e;case f.STRING:if(e===null)return"";if(typeof e!="string"){s="extra whitespace";break}try{encodeURIComponent(e)}catch(u){u="invalid UTF8";break}return e;case f.BYTES:if(e===null||e==="")return new Uint8Array(0);if(typeof e!="string")break;return Z(e)}}catch(o){s=o.message}this.assert(!1,i+(s?" - "+s:""),e)}};var Fr=h(l());var ce=class{constructor(e){var t;this.fields=(t=e.fields)!==null&&t!==void 0?t:[]}write(e,t){let r={},i=e;for(let s of this.fields){if(!s.oneof){let c=this.field(s,i[s.localName],t);c!==void 0&&(r[t.useProtoFieldName?s.name:s.jsonName]=c);continue}let o=i[s.oneof];if(o.oneofKind!==s.localName)continue;let a=s.kind=="scalar"||s.kind=="enum"?Object.assign(Object.assign({},t),{emitDefaultValues:!0}):t,u=this.field(s,o[s.localName],a);g(u!==void 0),r[t.useProtoFieldName?s.name:s.jsonName]=u}return r}field(e,t,r){let i;if(e.kind=="map"){g(typeof t=="object"&&t!==null);let s={};switch(e.V.kind){case"scalar":for(let[u,c]of Object.entries(t)){let d=this.scalar(e.V.T,c,e.name,!1,!0);g(d!==void 0),s[u.toString()]=d}break;case"message":let o=e.V.T();for(let[u,c]of Object.entries(t)){let d=this.message(o,c,e.name,r);g(d!==void 0),s[u.toString()]=d}break;case"enum":let a=e.V.T();for(let[u,c]of Object.entries(t)){g(c===void 0||typeof c=="number");let d=this.enum(a,c,e.name,!1,!0,r.enumAsInteger);g(d!==void 0),s[u.toString()]=d}break}(r.emitDefaultValues||Object.keys(s).length>0)&&(i=s)}else if(e.repeat){g(Array.isArray(t));let s=[];switch(e.kind){case"scalar":for(let u=0;u<t.length;u++){let c=this.scalar(e.T,t[u],e.name,e.opt,!0);g(c!==void 0),s.push(c)}break;case"enum":let o=e.T();for(let u=0;u<t.length;u++){g(t[u]===void 0||typeof t[u]=="number");let c=this.enum(o,t[u],e.name,e.opt,!0,r.enumAsInteger);g(c!==void 0),s.push(c)}break;case"message":let a=e.T();for(let u=0;u<t.length;u++){let c=this.message(a,t[u],e.name,r);g(c!==void 0),s.push(c)}break}(r.emitDefaultValues||s.length>0||r.emitDefaultValues)&&(i=s)}else switch(e.kind){case"scalar":i=this.scalar(e.T,t,e.name,e.opt,r.emitDefaultValues);break;case"enum":i=this.enum(e.T(),t,e.name,e.opt,r.emitDefaultValues,r.enumAsInteger);break;case"message":i=this.message(e.T(),t,e.name,r);break}return i}enum(e,t,r,i,s,o){if(e[0]=="google.protobuf.NullValue")return!s&&!i?void 0:null;if(t===void 0){g(i);return}if(!(t===0&&!s&&!i))return g(typeof t=="number"),g(Number.isInteger(t)),o||!e[1].hasOwnProperty(t)?t:e[2]?e[2]+e[1][t]:e[1][t]}message(e,t,r,i){return t===void 0?i.emitDefaultValues?null:void 0:e.internalJsonWrite(t,i)}scalar(e,t,r,i,s){if(t===void 0){g(i);return}let o=s||i;switch(e){case f.INT32:case f.SFIXED32:case f.SINT32:return t===0?o?0:void 0:(P(t),t);case f.FIXED32:case f.UINT32:return t===0?o?0:void 0:(j(t),t);case f.FLOAT:X(t);case f.DOUBLE:return t===0?o?0:void 0:(g(typeof t=="number"),Number.isNaN(t)?"NaN":t===Number.POSITIVE_INFINITY?"Infinity":t===Number.NEGATIVE_INFINITY?"-Infinity":t);case f.STRING:return t===""?o?"":void 0:(g(typeof t=="string"),t);case f.BOOL:return t===!1?o?!1:void 0:(g(typeof t=="boolean"),t);case f.UINT64:case f.FIXED64:g(typeof t=="number"||typeof t=="string"||typeof t=="bigint");let a=E.from(t);return a.isZero()&&!o?void 0:a.toString();case f.INT64:case f.SFIXED64:case f.SINT64:g(typeof t=="number"||typeof t=="string"||typeof t=="bigint");let u=N.from(t);return u.isZero()&&!o?void 0:u.toString();case f.BYTES:return g(t instanceof Uint8Array),t.byteLength?ye(t):o?"":void 0}}};var Pr=h(l());var Dr=h(l());function z(n,e=F.STRING){switch(n){case f.BOOL:return!1;case f.UINT64:case f.FIXED64:return S(E.ZERO,e);case f.INT64:case f.SFIXED64:case f.SINT64:return S(N.ZERO,e);case f.DOUBLE:case f.FLOAT:return 0;case f.BYTES:return new Uint8Array(0);case f.STRING:return"";default:return 0}}var le=class{constructor(e){this.info=e}prepare(){var e;if(!this.fieldNoToField){let t=(e=this.info.fields)!==null&&e!==void 0?e:[];this.fieldNoToField=new Map(t.map(r=>[r.no,r]))}}read(e,t,r,i){this.prepare();let s=i===void 0?e.len:e.pos+i;for(;e.pos<s;){let[o,a]=e.tag(),u=this.fieldNoToField.get(o);if(!u){let y=r.readUnknownField;if(y=="throw")throw new Error(`Unknown field ${o} (wire type ${a}) for ${this.info.typeName}`);let m=e.skip(a);y!==!1&&(y===!0?D.onRead:y)(this.info.typeName,t,o,a,m);continue}let c=t,d=u.repeat,I=u.localName;switch(u.oneof&&(c=c[u.oneof],c.oneofKind!==I&&(c=t[u.oneof]={oneofKind:I})),u.kind){case"scalar":case"enum":let y=u.kind=="enum"?f.INT32:u.T,m=u.kind=="scalar"?u.L:void 0;if(d){let x=c[I];if(a==b.LengthDelimited&&y!=f.STRING&&y!=f.BYTES){let p=e.uint32()+e.pos;for(;e.pos<p;)x.push(this.scalar(e,y,m))}else x.push(this.scalar(e,y,m))}else c[I]=this.scalar(e,y,m);break;case"message":if(d){let x=c[I],p=u.T().internalBinaryRead(e,e.uint32(),r);x.push(p)}else c[I]=u.T().internalBinaryRead(e,e.uint32(),r,c[I]);break;case"map":let[w,U]=this.mapEntry(u,e,r);c[I][w]=U;break}}}mapEntry(e,t,r){let i=t.uint32(),s=t.pos+i,o,a;for(;t.pos<s;){let[u,c]=t.tag();switch(u){case 1:e.K==f.BOOL?o=t.bool().toString():o=this.scalar(t,e.K,F.STRING);break;case 2:switch(e.V.kind){case"scalar":a=this.scalar(t,e.V.T,e.V.L);break;case"enum":a=t.int32();break;case"message":a=e.V.T().internalBinaryRead(t,t.uint32(),r);break}break;default:throw new Error(`Unknown field ${u} (wire type ${c}) in map entry for ${this.info.typeName}#${e.name}`)}}if(o===void 0){let u=z(e.K);o=e.K==f.BOOL?u.toString():u}if(a===void 0)switch(e.V.kind){case"scalar":a=z(e.V.T,e.V.L);break;case"enum":a=0;break;case"message":a=e.V.T().create();break}return[o,a]}scalar(e,t,r){switch(t){case f.INT32:return e.int32();case f.STRING:return e.string();case f.BOOL:return e.bool();case f.DOUBLE:return e.double();case f.FLOAT:return e.float();case f.INT64:return S(e.int64(),r);case f.UINT64:return S(e.uint64(),r);case f.FIXED64:return S(e.fixed64(),r);case f.FIXED32:return e.fixed32();case f.BYTES:return e.bytes();case f.UINT32:return e.uint32();case f.SFIXED32:return e.sfixed32();case f.SFIXED64:return S(e.sfixed64(),r);case f.SINT32:return e.sint32();case f.SINT64:return S(e.sint64(),r)}}};var _r=h(l());var he=class{constructor(e){this.info=e}prepare(){if(!this.fields){let e=this.info.fields?this.info.fields.concat():[];this.fields=e.sort((t,r)=>t.no-r.no)}}write(e,t,r){this.prepare();for(let s of this.fields){let o,a,u=s.repeat,c=s.localName;if(s.oneof){let d=e[s.oneof];if(d.oneofKind!==c)continue;o=d[c],a=!0}else o=e[c],a=!1;switch(s.kind){case"scalar":case"enum":let d=s.kind=="enum"?f.INT32:s.T;if(u)if(g(Array.isArray(o)),u==v.PACKED)this.packed(t,d,s.no,o);else for(let I of o)this.scalar(t,d,s.no,I,!0);else o===void 0?g(s.opt):this.scalar(t,d,s.no,o,a||s.opt);break;case"message":if(u){g(Array.isArray(o));for(let I of o)this.message(t,r,s.T(),s.no,I)}else this.message(t,r,s.T(),s.no,o);break;case"map":g(typeof o=="object"&&o!==null);for(let[I,y]of Object.entries(o))this.mapEntry(t,r,s,I,y);break}}let i=r.writeUnknownFields;i!==!1&&(i===!0?D.onWrite:i)(this.info.typeName,e,t)}mapEntry(e,t,r,i,s){e.tag(r.no,b.LengthDelimited),e.fork();let o=i;switch(r.K){case f.INT32:case f.FIXED32:case f.UINT32:case f.SFIXED32:case f.SINT32:o=Number.parseInt(i);break;case f.BOOL:g(i=="true"||i=="false"),o=i=="true";break}switch(this.scalar(e,r.K,1,o,!0),r.V.kind){case"scalar":this.scalar(e,r.V.T,2,s,!0);break;case"enum":this.scalar(e,f.INT32,2,s,!0);break;case"message":this.message(e,t,r.V.T(),2,s);break}e.join()}message(e,t,r,i,s){s!==void 0&&(r.internalBinaryWrite(s,e.tag(i,b.LengthDelimited).fork(),t),e.join())}scalar(e,t,r,i,s){let[o,a,u]=this.scalarInfo(t,i);(!u||s)&&(e.tag(r,o),e[a](i))}packed(e,t,r,i){if(!i.length)return;g(t!==f.BYTES&&t!==f.STRING),e.tag(r,b.LengthDelimited),e.fork();let[,s]=this.scalarInfo(t);for(let o=0;o<i.length;o++)e[s](i[o]);e.join()}scalarInfo(e,t){let r=b.Varint,i,s=t===void 0,o=t===0;switch(e){case f.INT32:i="int32";break;case f.STRING:o=s||!t.length,r=b.LengthDelimited,i="string";break;case f.BOOL:o=t===!1,i="bool";break;case f.UINT32:i="uint32";break;case f.DOUBLE:r=b.Bit64,i="double";break;case f.FLOAT:r=b.Bit32,i="float";break;case f.INT64:o=s||N.from(t).isZero(),i="int64";break;case f.UINT64:o=s||E.from(t).isZero(),i="uint64";break;case f.FIXED64:o=s||E.from(t).isZero(),r=b.Bit64,i="fixed64";break;case f.BYTES:o=s||!t.byteLength,r=b.LengthDelimited,i="bytes";break;case f.FIXED32:r=b.Bit32,i="fixed32";break;case f.SFIXED32:r=b.Bit32,i="sfixed32";break;case f.SFIXED64:o=s||N.from(t).isZero(),r=b.Bit64,i="sfixed64";break;case f.SINT32:i="sint32";break;case f.SINT64:o=s||N.from(t).isZero(),i="sint64";break}return[r,i,s||o]}};var vr=h(l());function _e(n){let e=n.messagePrototype?Object.create(n.messagePrototype):Object.defineProperty({},ae,{value:n});for(let t of n.fields){let r=t.localName;if(!t.opt)if(t.oneof)e[t.oneof]={oneofKind:void 0};else if(t.repeat)e[r]=[];else switch(t.kind){case"scalar":e[r]=z(t.T,t.L);break;case"enum":e[r]=0;break;case"map":e[r]={};break}}return e}var Hr=h(l());function M(n,e,t){let r,i=t,s;for(let o of n.fields){let a=o.localName;if(o.oneof){let u=i[o.oneof];if(u?.oneofKind==null)continue;if(r=u[a],s=e[o.oneof],s.oneofKind=u.oneofKind,r==null){delete s[a];continue}}else if(r=i[a],s=e,r==null)continue;switch(o.repeat&&(s[a].length=r.length),o.kind){case"scalar":case"enum":if(o.repeat)for(let c=0;c<r.length;c++)s[a][c]=r[c];else s[a]=r;break;case"message":let u=o.T();if(o.repeat)for(let c=0;c<r.length;c++)s[a][c]=u.create(r[c]);else s[a]===void 0?s[a]=u.create(r):u.mergePartial(s[a],r);break;case"map":switch(o.V.kind){case"scalar":case"enum":Object.assign(s[a],r);break;case"message":let c=o.V.T();for(let d of Object.keys(r))s[a][d]=c.create(r[d]);break}break}}}var tn=h(l());function Ze(n,e,t){if(e===t)return!0;if(!e||!t)return!1;for(let r of n.fields){let i=r.localName,s=r.oneof?e[r.oneof][i]:e[i],o=r.oneof?t[r.oneof][i]:t[i];switch(r.kind){case"enum":case"scalar":let a=r.kind=="enum"?f.INT32:r.T;if(!(r.repeat?Ge(a,s,o):ve(a,s,o)))return!1;break;case"map":if(!(r.V.kind=="message"?Ye(r.V.T(),me(s),me(o)):Ge(r.V.kind=="enum"?f.INT32:r.V.T,me(s),me(o))))return!1;break;case"message":let u=r.T();if(!(r.repeat?Ye(u,s,o):u.equals(s,o)))return!1;break}}return!0}var me=Object.values;function ve(n,e,t){if(e===t)return!0;if(n!==f.BYTES)return!1;let r=e,i=t;if(r.length!==i.length)return!1;for(let s=0;s<r.length;s++)if(r[s]!=i[s])return!1;return!0}function Ge(n,e,t){if(e.length!==t.length)return!1;for(let r=0;r<e.length;r++)if(!ve(n,e[r],t[r]))return!1;return!0}function Ye(n,e,t){if(e.length!==t.length)return!1;for(let r=0;r<e.length;r++)if(!n.equals(e[r],t[r]))return!1;return!0}var yt=Object.getOwnPropertyDescriptors(Object.getPrototypeOf({})),W=class{constructor(e,t,r){this.defaultCheckDepth=16,this.typeName=e,this.fields=t.map(Xe),this.options=r??{},this.messagePrototype=Object.create(null,Object.assign(Object.assign({},yt),{[ae]:{value:this}})),this.refTypeCheck=new fe(this),this.refJsonReader=new ue(this),this.refJsonWriter=new ce(this),this.refBinReader=new le(this),this.refBinWriter=new he(this)}create(e){let t=_e(this);return e!==void 0&&M(this,t,e),t}clone(e){let t=this.create();return M(this,t,e),t}equals(e,t){return Ze(this,e,t)}is(e,t=this.defaultCheckDepth){return this.refTypeCheck.is(e,t,!1)}isAssignable(e,t=this.defaultCheckDepth){return this.refTypeCheck.is(e,t,!0)}mergePartial(e,t){M(this,e,t)}fromBinary(e,t){let r=Ce(t);return this.internalBinaryRead(r.readerFactory(e),e.byteLength,r)}fromJson(e,t){return this.internalJsonRead(e,Je(t))}fromJsonString(e,t){let r=JSON.parse(e);return this.fromJson(r,t)}toJson(e,t){return this.internalJsonWrite(e,je(t))}toJsonString(e,t){var r;let i=this.toJson(e,t);return JSON.stringify(i,null,(r=t?.prettySpaces)!==null&&r!==void 0?r:0)}toBinary(e,t){let r=$e(t);return this.internalBinaryWrite(e,r.writerFactory(),r).finish()}internalJsonRead(e,t,r){if(e!==null&&typeof e=="object"&&!Array.isArray(e)){let i=r??this.create();return this.refJsonReader.read(e,i,t),i}throw new Error(`Unable to parse message ${this.typeName} from JSON ${Q(e)}.`)}internalJsonWrite(e,t){return this.refJsonWriter.write(e,t)}internalBinaryWrite(e,t,r){return this.refBinWriter.write(e,t,r),t}internalBinaryRead(e,t,r,i){let s=i??this.create();return this.refBinReader.read(e,s,r,t),s}};var Sn=h(l(),1);var xe=class extends W{constructor(){super("youtube.request.init.OnesieRequest",[{no:3,name:"encryptedInnertubeRequest",kind:"message",T:()=>Oe}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return e!==void 0&&M(this,t,e),t}internalBinaryRead(e,t,r,i){let s=i??this.create(),o=e.pos+t;for(;e.pos<o;){let[a,u]=e.tag();switch(a){case 3:s.encryptedInnertubeRequest=Oe.internalBinaryRead(e,e.uint32(),r,s.encryptedInnertubeRequest);break;default:let c=r.readUnknownField;if(c==="throw")throw new globalThis.Error(`Unknown field ${a} (wire type ${u}) for ${this.typeName}`);let d=e.skip(u);c!==!1&&(c===!0?D.onRead:c)(this.typeName,s,a,u,d)}}return s}internalBinaryWrite(e,t,r){e.encryptedInnertubeRequest&&Oe.internalBinaryWrite(e.encryptedInnertubeRequest,t.tag(3,b.LengthDelimited).fork(),r).join();let i=r.writeUnknownFields;return i!==!1&&(i==!0?D.onWrite:i)(this.typeName,e,t),t}},ze=new xe,Te=class extends W{constructor(){super("youtube.request.init.EncryptedInnertubeRequest",[{no:2,name:"encryptedOnesieInnertubeRequest",kind:"scalar",T:12},{no:5,name:"encryptedClientKey",kind:"scalar",T:12},{no:6,name:"iv",kind:"scalar",T:12},{no:7,name:"hmac",kind:"scalar",T:12}])}create(e){let t=globalThis.Object.create(this.messagePrototype);return t.encryptedOnesieInnertubeRequest=new Uint8Array(0),t.encryptedClientKey=new Uint8Array(0),t.iv=new Uint8Array(0),t.hmac=new Uint8Array(0),e!==void 0&&M(this,t,e),t}internalBinaryRead(e,t,r,i){let s=i??this.create(),o=e.pos+t;for(;e.pos<o;){let[a,u]=e.tag();switch(a){case 2:s.encryptedOnesieInnertubeRequest=e.bytes();break;case 5:s.encryptedClientKey=e.bytes();break;case 6:s.iv=e.bytes();break;case 7:s.hmac=e.bytes();break;default:let c=r.readUnknownField;if(c==="throw")throw new globalThis.Error(`Unknown field ${a} (wire type ${u}) for ${this.typeName}`);let d=e.skip(u);c!==!1&&(c===!0?D.onRead:c)(this.typeName,s,a,u,d)}}return s}internalBinaryWrite(e,t,r){e.encryptedOnesieInnertubeRequest.length&&t.tag(2,b.LengthDelimited).bytes(e.encryptedOnesieInnertubeRequest),e.encryptedClientKey.length&&t.tag(5,b.LengthDelimited).bytes(e.encryptedClientKey),e.iv.length&&t.tag(6,b.LengthDelimited).bytes(e.iv),e.hmac.length&&t.tag(7,b.LengthDelimited).bytes(e.hmac);let i=r.writeUnknownFields;return i!==!1&&(i==!0?D.onWrite:i)(this.typeName,e,t),t}},Oe=new Te;var bt="x-youtube-hot-hash-data",wt="content-encoding";function It(n,e){if(n.length!==e.length)return!1;for(let t=0;t<n.length;t++)if(n[t]!==e[t])return!1;return!0}function Nt(n,e){return n[e]?(delete n[e],!0):!1}function kt(n){let e=!!n.config[n.platformKey]?.clientKey,t={...n.headers};for(let r of Object.keys(t)){let i=r.toLowerCase();(i===wt||!e&&i===bt)&&delete t[r]}return{action:"headers",headers:t,config:n.config,changed:!1}}function Ot(n,e,t,r){let i=[`ck=${encodeURIComponent(e)}`,`target=${encodeURIComponent(t)}`];for(let[s,o]of Object.entries(r))i.push(`${s}=${encodeURIComponent(String(o))}`);return`${n}?${i.join("&")}`}function xt(n){let e=n.config[n.platformKey],t=e?.clientKey,r=e?.encryptKey;if(r&&t&&n.bodyBytes!=null){let i=ze.fromBinary(n.bodyBytes).encryptedInnertubeRequest?.encryptedClientKey;if(i&&It(i,Z(r)))return{action:"redirect",redirectUrl:Ot(n.workerUrl,t,n.url,n.params),config:n.config,changed:!1}}return{action:"empty",config:n.config,changed:Nt(n.config,n.platformKey)}}function He(n){return n.url.includes("log_event")?kt(n):n.url.includes("initplayback")?xt(n):{action:"exit",config:n.config,changed:!1}}var Xn=h(l(),1);var Cn=h(l(),1);var _=class{_times=new Map;name;isDebug;className;request;response;constructor(e,t,r){this.name=e??"",this.isDebug=r?.debug??!1,e&&this.debug(`${e} Start`),this.className=t??"",this.init()}static getInstance(e,t){let r="Surge";return typeof $loon<"u"?r="Loon":typeof $task<"u"&&(r="QuanX"),_.instances[r]||(_.instances[r]=_.classNames[r](e,r,t)),_.instances[r]}createProxy(e){return new Proxy(e,{get:this.getFn,set:this.setFn})}getFn(e,t,r){return e[t]}setFn(e,t,r,i){return e[t]=r,!0}getJSON(e,t={}){let r=this.getVal(e);return r?JSON.parse(r):t}setJSON(e,t){this.setVal(JSON.stringify(e),t)}msg(e=this.name,t="",r="",i){}debug(e){this.isDebug&&(typeof e=="object"&&(e=JSON.stringify(e)),console.log(e))}log(e){typeof e=="object"&&(e=JSON.stringify(e)),console.log(e)}timeStart(e){this._times.set(e,Date.now())}timeEnd(e){if(this._times.has(e)){let t=this._times.get(e)??0,r=Date.now()-t;this.debug(`${e}: ${r}ms`),this._times.delete(e)}else this.debug(`Timer with label ${e} does not exist.`)}exit(){$done({})}reject(){$done()}decodeParams(e){return e}},$=_;Y($,"instances",{}),Y($,"classNames",{QuanX:(e,t,r)=>new de(e,t,r),Surge:(e,t,r)=>new H(e,t,r),Loon:(e,t,r)=>new Ee(e,t,r)});var pe=class extends ${getFn(e,t,r){let i=pe.clientAdapter[t]||t;return super.getFn(e,i,r)}setFn(e,t,r,i){let s=pe.clientAdapter[t]||t;return super.setFn(e,s,r,i)}init(){try{this.request=this.createProxy($request),this.response=this.createProxy($response)}catch(e){this.debug(e.toString())}}getVal(e){return $persistentStore.read(e)}setVal(e,t){$persistentStore.write(e,t)}msg(e=this.name,t="",r="",i){let s={};i&&(s={action:{"open-url":i}}),$notification.post(e,t,r,s)}async fetch(e){return await new Promise((t,r)=>{let{method:i,body:s,bodyBytes:o,...a}=e,u=o??s,c=u instanceof Uint8Array;$httpClient[i.toLowerCase()]({...a,body:u,"binary-mode":c},(d,I,y)=>{d&&r(d);let m=c?"bodyBytes":"body";t({status:I.status??I.statusCode,headers:I.headers,[m]:y})})})}done(e){let t=e.response??e;t.bodyBytes&&(t.body=t.bodyBytes,delete t.bodyBytes),$done(e.response?{response:t}:t)}decodeParams(e){return typeof $argument=="string"&&!$argument.includes("{{{")&&Object.assign(e,JSON.parse($argument)),e}},H=pe;Y(H,"clientAdapter",{bodyBytes:"body"});var q=class extends ${static transferBodyBytes(e,t){return e instanceof ArrayBuffer?t==="Uint8Array"?new Uint8Array(e):e:e instanceof Uint8Array&&t==="ArrayBuffer"?e.buffer.slice(e.byteOffset,e.byteLength+e.byteOffset):e}init(){try{this.request=this.createProxy($request),this.response=this.createProxy($response)}catch(e){this.debug(e.toString())}}getFn(e,t,r){let i=q.clientAdapter[t]||t,s=super.getFn(e,i,r);return t==="bodyBytes"&&(s=q.transferBodyBytes(s,"Uint8Array")),s}setFn(e,t,r,i){let s=q.clientAdapter[t]||t,o=r;return t==="bodyBytes"&&(o=q.transferBodyBytes(o,"Uint8Array")),super.setFn(e,s,o,i)}getVal(e){return $prefs.valueForKey(e)}setVal(e,t){$prefs.setValueForKey(e,t)}msg(e=this.name,t="",r="",i){$notify(e,t,r,{"open-url":i??""})}async fetch(e){return await new Promise(t=>{let r={url:"",method:"GET"};for(let[i,s]of Object.entries(e))i==="id"?r.sessionIndex=s:i==="bodyBytes"?r.bodyBytes=q.transferBodyBytes(s,"ArrayBuffer"):r[i]=s;e.bodyBytes&&delete r.body,$task.fetch(r).then(i=>{let s={status:200,headers:{}};for(let[o,a]of Object.entries(i))o==="sessionIndex"?s.id=a:o==="bodyBytes"?s.bodyBytes=q.transferBodyBytes(a,"Uint8Array"):o==="statusCode"?s.status=a:s[o]=a;t(s)})})}done(e){let t=e.response??e,r={};for(let[i,s]of Object.entries(t))i==="status"?r.status=`HTTP/1.1 ${s}`:i==="bodyBytes"?r.bodyBytes=q.transferBodyBytes(s,"ArrayBuffer"):r[i]=s;$done(r)}},de=q;Y(de,"clientAdapter",{id:"sessionIndex",status:"statusCode"});var Ee=class extends H{decodeParams(e){if(typeof $argument<"u")for(let t of Object.keys(e)){let r=$argument?.[t];r!==void 0&&(e[t]=r)}return e}};var Pn=h(l(),1),Be={config:"YouTubeConfig",advertiseInfo:"YouTubeAdvertiseInfo"},Re={music:"youtubeMusic",video:"youtube"},Qe="https://init-stream.maasea.workers.dev/";var R=$.getInstance("YouTube");function Tt(){return(R.request.headers["user-agent"]??R.request.headers["User-Agent"]).includes("music")}function Fe(){return Tt()?Re.music:Re.video}var Gn=h(l(),1);function et(){return R.decodeParams({captionLang:"off",blockUpload:!0,blockImmersive:!0,blockShorts:!1})}var zn=h(l(),1);function tt(){return R.getJSON(Be.config)??{}}function rt(n){R.debug(`saveKeyConfig: ${JSON.stringify(n)}`),R.setJSON(n,Be.config)}function Et(){let n=He({url:R.request.url,headers:R.request.headers,bodyBytes:R.request.bodyBytes,config:tt(),params:et(),platformKey:Fe(),workerUrl:Qe});switch(n.changed&&rt(n.config),n.action){case"headers":R.debug("log_event: \u5265\u79BB content-encoding \u5934\uFF0C\u5E76\u6309\u7F13\u5B58\u72B6\u6001\u51B3\u5B9A\u662F\u5426\u5220 hot-hash \u5934"),R.done({headers:n.headers});break;case"redirect":R.debug("initplayback: \u547D\u4E2D\u7F13\u5B58 key\uFF0C\u91CD\u5B9A\u5411\u5230 Worker \u5904\u7406 UMP"),$done({url:n.redirectUrl});break;case"empty":R.debug("initplayback: encryptedClientKey \u4E0E\u7F13\u5B58\u4E0D\u4E00\u81F4\uFF0C\u9000\u56DE v1/player \u5E76\u6E05\u7F13\u5B58"),$done({response:{status:200,headers:{"Content-Type":"text/plain"},body:new Uint8Array}});break;default:R.exit()}}Et();})();

}
function runYouTubeMusic($done, $argument, $request, $response) {
// YouTube Music iOS: playback ad removal and background playback.
(() => {
  try {
    const url = String($request.url || "");
    const headers = $request.headers || {};
    const userAgent = Object.keys(headers).find(key => key.toLowerCase() === "user-agent");
    const music = /com\.google\.ios\.youtubemusic\//i.test(headers[userAgent] || "");
    if (!music) return $done({});

    if (typeof $response === "undefined") {
      // An empty Onesie result lets this client retry the standard player API.
      // Only the observed Music playback request is affected, never media chunks.
      if ($request.method === "POST"
        && /^https:\/\/[\w-]+\.googlevideo\.com(?::443)?\/initplayback\?/i.test(url)
        && /[?&]c=IOS_MUSIC(?:&|$)/.test(url) && /[?&]ack=1(?:&|$)/.test(url)) {
        console.log("YouTube Music: retry through player API");
        return $done({ response: { status: 200, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" }, body: "" } });
      }
      return $done({});
    }
    const route = /^https:\/\/youtubei\.googleapis\.com(?::443)?\/youtubei\/v1\/(player|next|get_watch|guide)(?:\?|$)/i.exec(url);
    if (!route || Number($response.status || $response.statusCode) !== 200) return $done({});
    const source = $response.body;
    const input = ArrayBuffer.isView(source)
      ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
      : source instanceof ArrayBuffer ? new Uint8Array(source) : null;
    if (!input?.length || input.length > 4194304) return $done({});

    function fields(data) {
      let offset = 0;
      function uint() {
        let value = 0;
        for (let i = 0; i < 5; i++) {
          if (offset >= data.length) throw Error("truncated varint");
          const byte = data[offset++];
          value += (byte & 127) * 2 ** (i * 7);
          if (!(byte & 128)) {
            if (value > 0xffffffff) throw Error("varint overflow");
            return value;
          }
        }
        throw Error("invalid varint");
      }
      const result = [];
      while (offset < data.length) {
        const start = offset, tag = uint(), number = Math.floor(tag / 8), wire = tag % 8;
        if (!number || result.length >= 100000) throw Error("invalid message");
        let payload;
        if (wire === 0) {
          let count = 0, byte;
          do {
            if (offset >= data.length || count === 10) throw Error("invalid scalar");
            byte = data[offset++]; count++;
            if (count === 10 && byte > 1) throw Error("scalar overflow");
          } while (byte & 128);
        } else if (wire === 1 || wire === 5) offset += wire === 1 ? 8 : 4;
        else if (wire === 2) {
          const length = uint();
          if (length > data.length - offset) throw Error("invalid length");
          payload = data.subarray(offset, offset + length); offset += length;
        } else throw Error("unsupported wire type");
        if (offset > data.length) throw Error("truncated field");
        result.push({ number, wire, payload, raw: data.subarray(start, offset) });
      }
      return result;
    }
    function join(parts) {
      const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
      let offset = 0;
      for (const part of parts) { output.set(part, offset); offset += part.length; }
      return output;
    }
    function uint(value) {
      const result = [];
      do { const byte = value % 128; value = Math.floor(value / 128); result.push(byte | (value ? 128 : 0)); } while (value);
      return new Uint8Array(result);
    }
    const blob = (number, data) => join([uint(number * 8 + 2), uint(data.length), data]);
    const enabled = new Uint8Array([8, 1]);
    let ads = 0, background = 0, navigation = 0;
    function replace(list, number, payload) {
      const found = list.filter(field => field.number === number && field.wire === 2);
      if (found.length === 1 && equal(found[0].payload, payload)) return join(list.map(field => field.raw));
      return join([...list.filter(field => field.number !== number || field.wire !== 2).map(field => field.raw), blob(number, payload)]);
    }
    function equal(a, b) { return a.length === b.length && a.every((byte, index) => byte === b[index]); }
    function backgroundAbility(data) {
      const list = fields(data), renderer = list.find(field => field.number === 11 && field.wire === 2);
      const child = renderer ? fields(renderer.payload) : [];
      const ability = child.find(field => field.number === 64657230 && field.wire === 2);
      const values = ability ? fields(ability.payload) : [];
      const patchedAbility = join([...values.filter(field => field.number !== 1 || field.wire !== 0).map(field => field.raw), enabled]);
      let output = replace(list, 11, replace(child, 64657230, patchedAbility));
      if (!equal(output, data)) background++;
      return output;
    }
    function player(data) {
      const list = fields(data), output = [];
      for (const field of list) {
        if ((field.number === 7 || field.number === 68) && field.wire === 2) { ads++; continue; }
        if (field.number === 2 && field.wire === 2) output.push(blob(2, backgroundAbility(field.payload)));
        else output.push(field.raw);
      }
      return join(output);
    }
    function contains(data, needle) {
      outer: for (let i = 0; i <= data.length - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) if (data[i + j] !== needle.charCodeAt(j)) continue outer;
        return true;
      }
      return false;
    }
    function next(data) {
      return join(fields(data).filter(field => {
        // Captured IOS_MUSIC next responses carry an advertiser overlay here.
        if (field.number === 14 && field.wire === 2 && contains(field.payload, "googleadservices.com/pagead/aclk")) { ads++; return false; }
        return true;
      }).map(field => field.raw));
    }
    function watch(data) {
      return join(fields(data).map(field => {
        if (field.number !== 1 || field.wire !== 2) return field.raw;
        return blob(1, join(fields(field.payload).map(child => {
          if (child.wire !== 2) return child.raw;
          if (child.number === 2) return blob(2, player(child.payload));
          if (child.number === 3) return blob(3, next(child.payload));
          return child.raw;
        })));
      }));
    }
    function guide(data) {
      return join(fields(data).map(group => {
        if (group.wire !== 2 || ![4, 6].includes(group.number)) return group.raw;
        return blob(group.number, join(fields(group.payload).map(section => {
          if (section.number !== 117866661 || section.wire !== 2) return section.raw;
          return blob(section.number, join(fields(section.payload).filter(item => {
            if (item.number !== 1 || item.wire !== 2) return true;
            for (const renderer of fields(item.payload)) {
              if (renderer.wire !== 2 || ![117501096, 318370163].includes(renderer.number)) continue;
              const id = fields(renderer.payload).find(field => field.number === 1 && field.wire === 2);
              if (id && equal(id.payload, new Uint8Array([83, 80, 117, 110, 108, 105, 109, 105, 116, 101, 100]))) { navigation++; return false; }
            }
            return true;
          }).map(item => item.raw)));
        })));
      }));
    }
    const output = ({ player, next, get_watch: watch, guide })[route[1].toLowerCase()](input);
    if (equal(input, output)) return $done({});
    console.log("YouTube Music: " + route[1] + ", ads=" + ads + ", background=" + background + ", navigation=" + navigation);
    return $done({ body: output });
  } catch (_) {
    console.log("YouTube Music: unexpected response left unchanged");
    return $done({});
  }
})();

}
function runSpotifyHome($done, $argument, $request, $response) {
// Casita HomeResponse: field 1 contains repeated section entries in field 1.
// A section's nested field 1 is its identifier; keep all other fields verbatim.
(() => {
  function readVarint(bytes, offset, end) {
    let value = 0;
    for (let i = 0; i < 5 && offset < end; i++) {
      const byte = bytes[offset++];
      value += (byte & 0x7f) * 2 ** (i * 7);
      if (value > 0xffffffff) throw new Error("varint overflow");
      if (byte < 0x80) return { value, offset };
    }
    throw new Error("invalid varint");
  }

  function fields(bytes) {
    const result = [];
    let offset = 0;
    while (offset < bytes.length) {
      const start = offset;
      const tag = readVarint(bytes, offset, bytes.length);
      const number = Math.floor(tag.value / 8);
      const wire = tag.value % 8;
      if (!number) throw new Error("invalid field");
      offset = tag.offset;
      let dataStart = offset;
      if (wire === 0) {
        let count = 0;
        while (true) {
          if (offset >= bytes.length || count === 10) {
            throw new Error("invalid scalar");
          }
          const byte = bytes[offset++];
          if (++count === 10 && byte > 1) throw new Error("scalar overflow");
          if (byte < 0x80) break;
        }
      } else if (wire === 1 || wire === 5) {
        offset += wire === 1 ? 8 : 4;
      } else if (wire === 2) {
        const length = readVarint(bytes, offset, bytes.length);
        dataStart = length.offset;
        offset = dataStart + length.value;
      } else {
        throw new Error("unsupported wire type");
      }
      if (offset > bytes.length) throw new Error("truncated field");
      result.push({ number, wire, start, tagEnd: tag.offset, dataStart, end: offset });
    }
    return result;
  }

  function concat(parts) {
    const bytes = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    return bytes;
  }

  function encodeLength(value) {
    const bytes = [];
    do {
      const next = value % 128;
      value = Math.floor(value / 128);
      bytes.push(next | (value ? 0x80 : 0));
    } while (value);
    return new Uint8Array(bytes);
  }

  function isBrandAd(section) {
    for (const identifier of fields(section)) {
      if (identifier.number !== 1 || identifier.wire !== 2) continue;
      const wrapper = section.subarray(identifier.dataStart, identifier.end);
      for (const value of fields(wrapper)) {
        if (value.number !== 1 || value.wire !== 2) continue;
        const id = wrapper.subarray(value.dataStart, value.end);
        if (id.length > 512) continue;
        let text = "";
        for (const byte of id) text += String.fromCharCode(byte);
        if (text.startsWith("spotify:section:") && text.endsWith("|brand-ad")) {
          return true;
        }
      }
    }
    return false;
  }

  let output;
  try {
    if ($response.status !== undefined && Number($response.status) !== 200) {
      throw new Error("non-success response");
    }
    const body = $response.body;
    let bytes;
    if (ArrayBuffer.isView(body)) {
      bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    } else if (body instanceof ArrayBuffer) {
      bytes = new Uint8Array(body);
    } else if (Array.isArray(body)) {
      bytes = new Uint8Array(body);
    } else {
      throw new Error("unsupported body");
    }

    let removed = 0;
    const parts = fields(bytes).map((field) => {
      const original = bytes.subarray(field.start, field.end);
      if (field.number !== 1 || field.wire !== 2) return original;
      const sections = bytes.subarray(field.dataStart, field.end);
      let changed = false;
      const kept = [];
      for (const section of fields(sections)) {
        if (section.number === 1 && section.wire === 2 &&
            isBrandAd(sections.subarray(section.dataStart, section.end))) {
          removed++;
          changed = true;
        } else {
          kept.push(sections.subarray(section.start, section.end));
        }
      }
      if (!changed) return original;
      const payload = concat(kept);
      return concat([bytes.subarray(field.start, field.tagEnd), encodeLength(payload.length), payload]);
    });
    if (removed) {
      output = concat(parts);
      console.log(`Spotify Home: removed ${removed} brand-ad section(s)`);
    }
  } catch (_) {
    console.log("Spotify Home: unrecognized response, passed through");
  }
  $done(output ? { body: output } : {});
})();

}
function runSpotifyLyrics($done, $argument, $request, $response) {
// Spotify lyrics: one response pipeline, native wire format, independent cache.
(() => {
  const KEY = "UKIX.Spotify.Lyrics.v1";
  const DAY = 86400000;
  const MAX_LINES = 500;
  const now = () => Date.now();
  const args = {};
  for (const part of String(typeof $argument === "string" ? $argument : "").split("&")) {
    const at = part.indexOf("=");
    if (at < 1) continue;
    try { args[part.slice(0, at)] = decodeURIComponent(part.slice(at + 1)).replace(/^"|"$/g, ""); } catch (_) { /* Keep defaults. */ }
  }
  const enabled = args.Lyrics !== "false";
  const translate = args.Translate !== "false";
  const target = /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(args.TargetLanguage || "") ? args.TargetLanguage : "zh-CN";
  const url = String($request.url || "");
  const deadline = now() + (/\/scrollsita\//.test(url) ? 3500 : 15000);

  function bytes(value) {
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (typeof value === "string") return utf8(value);
    throw new Error("unsupported body");
  }
  function utf8(value) {
    const out = [];
    for (const character of String(value)) {
      let c = character.codePointAt(0);
      if (c >= 0xd800 && c <= 0xdfff) c = 0xfffd;
      if (c < 128) out.push(c);
      else if (c < 2048) out.push(192 | c >> 6, 128 | c & 63);
      else if (c < 65536) out.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
      else out.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
    }
    return new Uint8Array(out);
  }
  function text(value) {
    if (value.length > 131072) throw new Error("oversized text");
    return decodeURIComponent(Array.from(value, c => "%" + c.toString(16).padStart(2, "0")).join(""));
  }
  function join(parts) {
    const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
    let offset = 0;
    for (const part of parts) { out.set(part, offset); offset += part.length; }
    return out;
  }
  function integer(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid integer");
    const out = [];
    do { const b = value % 128; value = Math.floor(value / 128); out.push(b | (value ? 128 : 0)); } while (value);
    return new Uint8Array(out);
  }
  const blob = (n, value) => join([integer(n * 8 + 2), integer(value.length), value]);
  const string = (n, value) => blob(n, utf8(value));
  const scalar = (n, value) => join([integer(n * 8), integer(value)]);
  function int32(n, value) {
    const encoded = integer(value >>> 0);
    if (value >= 0) return join([integer(n * 8), encoded]);
    // Negative int32 values are sign-extended to a ten-byte protobuf varint.
    encoded[4] |= 0xf0;
    return join([integer(n * 8), encoded, new Uint8Array([255, 255, 255, 255, 1])]);
  }
  function fields(input) {
    let offset = 0;
    function read(limit) {
      let value = 0;
      for (let i = 0; i < limit; i++) {
        if (offset >= input.length) throw new Error("truncated protobuf");
        const b = input[offset++];
        if (i === 9 && b > 1) throw new Error("scalar overflow");
        value += (b & 127) * 2 ** (7 * i);
        if (b < 128) return value;
      }
      throw new Error("invalid varint");
    }
    const result = [];
    while (offset < input.length) {
      const start = offset, tag = read(5), number = Math.floor(tag / 8), wire = tag % 8;
      if (!number || tag > 0xffffffff) throw new Error("invalid tag");
      let payload, value;
      if (wire === 0) value = read(10);
      else if (wire === 1 || wire === 5) offset += wire === 1 ? 8 : 4;
      else if (wire === 2) {
        const length = read(5);
        if (length > input.length - offset) throw new Error("invalid length");
        payload = input.subarray(offset, offset + length); offset += length;
      } else throw new Error("unsupported protobuf wire");
      if (offset > input.length) throw new Error("truncated field");
      result.push({ number, wire, value, payload, raw: input.subarray(start, offset) });
    }
    return result;
  }
  const one = (list, n, wire = 2) => list.find(f => f.number === n && f.wire === wire);
  const str = (list, n) => { const f = one(list, n); return f ? text(f.payload) : ""; };
  function mapMessage(input, visit) {
    return join(fields(input).map(f => {
      const value = visit(f);
      return value === undefined ? f.raw : blob(f.number, value);
    }));
  }
  function base62(gid) {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", digits = Array.from(gid);
    let output = "";
    while (digits.some(Boolean)) {
      let carry = 0;
      for (let i = 0; i < digits.length; i++) {
        const n = carry * 256 + digits[i]; digits[i] = Math.floor(n / 62); carry = n % 62;
      }
      output = alphabet[carry] + output;
    }
    return output.padStart(22, "0");
  }
  function cache() {
    try {
      const value = JSON.parse($persistentStore.read(KEY) || "{}");
      return value.version === 1 && value.tracks && typeof value.tracks === "object" ? value : { version: 1, tracks: {}, cooldowns: {} };
    } catch (_) { return { version: 1, tracks: {}, cooldowns: {} }; }
  }
  function save(change) {
    try {
      const value = cache(); change(value);
      const ids = Object.keys(value.tracks).sort((a, b) => (value.tracks[b].updated || 0) - (value.tracks[a].updated || 0));
      let size = 0;
      for (const [i, id] of ids.entries()) {
        size += JSON.stringify(value.tracks[id]).length;
        if (i >= 40 || size > 500000) delete value.tracks[id];
      }
      $persistentStore.write(JSON.stringify(value), KEY);
    } catch (_) { console.log("Spotify lyrics: cache write skipped"); }
  }
  function storeTrack(id, update) {
    save(value => { value.tracks[id] = { ...(value.tracks[id] || {}), ...update, updated: now() }; });
  }
  function available(id) {
    const entry = cache().tracks[id];
    return entry?.expires > now() && entry.result?.lines?.some(line => line.words.trim());
  }
  function header(headers, name) {
    const key = Object.keys(headers || {}).find(k => k.toLowerCase() === name);
    return key ? headers[key] : "";
  }
  function http(address, vendor) {
    return new Promise((resolve, reject) => {
      if (now() >= deadline || (cache().cooldowns?.[vendor] || 0) > now()) return reject(new Error("lookup deferred"));
      const headers = { "User-Agent": "UKIX-Spotify-Lyrics/1.0 (https://github.com/Reukix/ukix)", Accept: "application/json,text/html" };
      if (vendor === "netease") headers.Referer = "https://music.163.com/";
      // Construct fresh headers: never forward Spotify tokens, cookies or device IDs.
      $httpClient.get({ url: address, headers, timeout: Math.max(1, Math.min(4, Math.floor((deadline - now()) / 1000))), "auto-cookie": false }, (error, response, body) => {
        const status = Number(response?.status || response?.statusCode);
        if (status === 429 || status === 503) {
          const retry = String(header(response.headers, "retry-after"));
          const seconds = /^\d+$/.test(retry) ? Number(retry) : Math.max(0, (Date.parse(retry) - now()) / 1000);
          save(value => { value.cooldowns = value.cooldowns || {}; value.cooldowns[vendor] = now() + (Number.isFinite(seconds) ? Math.max(1, seconds) : 60) * 1000 + 500; });
        }
        if (error || !response || status !== 200) return reject(new Error("lookup unavailable"));
        try { resolve(typeof body === "string" ? body : text(bytes(body))); } catch (e) { reject(e); }
      });
    });
  }
  const json = async (address, vendor) => JSON.parse(await http(address, vendor));
  const normalize = value => String(value || "").normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
  function matched(info, title, artists, durationMs) {
    return normalize(info.title) === normalize(title)
      && artists.some(artist => normalize(artist) === normalize(info.artists[0]))
      && (!info.durationMs || (Number.isFinite(durationMs) && Math.abs(info.durationMs - durationMs) <= 3000));
  }
  function cleanLines(lines) {
    if (lines.length > MAX_LINES) throw new Error("too many lines");
    return lines.filter(line => line.words.trim()).sort((a, b) => a.start - b.start).map((line, i, all) => ({
      ...line, end: line.end || (all[i + 1]?.start > line.start ? all[i + 1].start : 0),
    }));
  }
  function lrc(input, plain = false) {
    if (typeof input !== "string" || input.length > 100000) return [];
    const lines = [], offset = Number(/\[offset:([+-]?\d+)\]/i.exec(input)?.[1] || 0);
    for (const row of input.split(/\r?\n/)) {
      const times = [...row.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
      const words = row.replace(/\[[^\]]*\]/g, "").trim();
      if (!words) continue;
      if (times.length) for (const t of times) lines.push({ start: Math.max(0, Number(t[1]) * 60000 + Number(t[2]) * 1000 + Number((t[3] || "").padEnd(3, "0")) + offset), words, syllables: [] });
      else if (plain && !/^\s*\[[a-z]+:/i.test(row)) lines.push({ start: 0, words, syllables: [] });
    }
    return cleanLines(lines);
  }
  function yrc(input) {
    if (typeof input !== "string" || input.length > 100000) return [];
    const lines = [];
    for (const row of input.split(/\r?\n/)) {
      const time = /^\[(\d+),(\d+)\]/.exec(row);
      if (!time) continue;
      const body = row.slice(time[0].length), markers = [...body.matchAll(/\((\d+),(\d+),\d+\)/g)];
      const parts = markers.map((marker, i) => [marker[0], marker[1], marker[2], body.slice(marker.index + marker[0].length, markers[i + 1]?.index ?? body.length)]);
      if (!parts.length) continue;
      lines.push({ start: Number(time[1]), end: Number(time[1]) + Number(time[2]), words: parts.map(p => p[3]).join(""), syllables: parts.filter(p => p[3].length).map(p => ({ startTimeMs: String(p[1]), numChars: p[3].length })) });
    }
    return cleanLines(lines);
  }
  function meaningful(lines) {
    return lines.length && !(lines.length === 1 && /^\s*(?:纯音乐[，,\s]*(?:请欣赏)?|\[?instrumental\]?)\s*$/i.test(lines[0].words));
  }
  async function infoFor(id) {
    const saved = cache().tracks[id]?.info;
    if (saved?.title && saved?.artists?.length) return saved;
    const html = await http("https://open.spotify.com/embed/track/" + id, "spotify-public");
    const match = /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
    if (!match) return null;
    const entity = JSON.parse(match[1])?.props?.pageProps?.state?.data?.entity;
    if (entity?.id !== id || entity.uri !== "spotify:track:" + id || !entity.name || !entity.artists?.[0]?.name) return null;
    const info = { id, title: entity.name, artists: entity.artists.map(a => a.name).filter(Boolean), album: entity.album?.name || entity.albumName || "", durationMs: Number(entity.duration) || 0 };
    storeTrack(id, { info }); return info;
  }
  async function netease(info) {
    const search = await json("https://music.163.com/api/cloudsearch/pc?type=1&limit=5&offset=0&s=" + encodeURIComponent(info.title + " " + info.artists[0]), "netease");
    if (search.code !== 200) throw new Error("search unavailable");
    const songs = (search.result?.songs || []).filter(song => matched(info, song.name, (song.ar || song.artists || []).map(a => a.name), Number(song.dt || song.duration)));
    for (const song of songs.slice(0, 2)) {
      const result = await json("https://music.163.com/api/song/lyric?id=" + song.id + "&lv=-1&yv=-1&tv=-1", "netease");
      if (result.code !== 200 || result.nolyric || result.uncollected) continue;
      const words = yrc(result.yrc?.lyric), lines = words.length ? words : lrc(result.lrc?.lyric);
      if (!meaningful(lines)) continue;
      const translated = lrc(result.tlyric?.lyric), alternatives = [];
      if (/^zh(?:-|$)/i.test(target) && translated.length) {
        const aligned = lines.map(line => translated.find(t => Math.abs(t.start - line.start) <= 150)?.words || "");
        if (aligned.some(Boolean)) alternatives.push({ language: "zh", lines: aligned });
      }
      return { sync: words.length ? 2 : 1, lines, provider: "NeteaseMusic", providerId: String(song.id), alternatives };
    }
    return null;
  }
  async function lrclib(info) {
    const query = "track_name=" + encodeURIComponent(info.title) + "&artist_name=" + encodeURIComponent(info.artists[0]);
    let record;
    try { record = await json("https://lrclib.net/api/get?" + query + (info.album ? "&album_name=" + encodeURIComponent(info.album) : "") + (info.durationMs ? "&duration=" + Math.round(info.durationMs / 1000) : ""), "lrclib"); } catch (_) {
      const found = await json("https://lrclib.net/api/search?" + query, "lrclib");
      record = (Array.isArray(found) ? found : []).filter(r => !r.instrumental && matched(info, r.trackName, [r.artistName, ...String(r.artistName).split(/\s*[;&,/]\s*/)], Number(r.duration) * 1000)).sort((a, b) => Number(Boolean(b.syncedLyrics)) - Number(Boolean(a.syncedLyrics)))[0];
    }
    if (!record || record.instrumental || !matched(info, record.trackName, [record.artistName, ...String(record.artistName).split(/\s*[;&,/]\s*/)], Number(record.duration) * 1000)) return null;
    const synced = lrc(record.syncedLyrics), lines = synced.length ? synced : lrc(record.plainLyrics, true);
    return meaningful(lines) ? { sync: synced.length ? 1 : 0, lines, provider: "LRCLIB", providerId: String(record.id), alternatives: [] } : null;
  }
  async function external(id) {
    const entry = cache().tracks[id];
    if (entry?.expires > now()) return entry.result || null;
    const info = await infoFor(id);
    if (!info) return null;
    let complete = true;
    for (const provider of [netease, lrclib]) {
      try {
        const result = await provider(info);
        if (result) { storeTrack(id, { result, expires: now() + 7 * DAY }); return result; }
      } catch (_) { complete = false; }
    }
    if (complete) storeTrack(id, { result: null, expires: now() + 15 * 60000 });
    return null;
  }
  const languageKey = lang => /^zh(?:-|$)/i.test(lang) ? "zh" : String(lang).toLowerCase();
  async function translations(id, lines, alternatives) {
    if (!translate || alternatives.some(a => languageKey(a.language) === languageKey(target))) return null;
    const source = lines.map(line => line.words).join("\n"), saved = cache().tracks[id]?.translations?.[target];
    if (saved?.source === source && saved.expires > now()) return saved.lines;
    const groups = []; let group = [], length = 0;
    for (const line of lines) {
      if (line.words.length > 900) return null;
      if (length + line.words.length > 900 && group.length) { groups.push(group); group = []; length = 0; }
      group.push(line.words); length += line.words.length + 1;
    }
    if (group.length) groups.push(group);
    if (groups.length > 5) return null;
    const output = [];
    for (const chunk of groups) {
      const data = await json("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + encodeURIComponent(target) + "&dt=t&q=" + encodeURIComponent(chunk.join("\n")), "google");
      const translated = data?.[0]?.map(row => row?.[0] || "").join("").replace(/\r/g, "").trimEnd().split("\n");
      if (!translated || translated.length !== chunk.length) return null;
      output.push(...translated);
    }
    if (output.every((line, i) => line === lines[i].words)) return null;
    storeTrack(id, { translations: { ...(cache().tracks[id]?.translations || {}), [target]: { source, lines: output, expires: now() + 7 * DAY } } });
    return output;
  }
  function nativeTrack(track, expectedId) {
    const list = fields(track), gid = one(list, 1)?.payload;
    if (gid?.length !== 16) return track;
    const id = base62(gid);
    if (expectedId && id !== expectedId) return track;
    const title = str(list, 2), artists = list.filter(f => f.number === 4 && f.wire === 2).map(f => str(fields(f.payload), 2)).filter(Boolean);
    if (!title || !artists.length) return track;
    const album = one(list, 3), duration = one(list, 7, 0)?.value;
    storeTrack(id, { info: { id, title, artists, album: album ? str(fields(album.payload), 2) : "", durationMs: Number.isSafeInteger(duration) ? Math.floor(duration / 2) : 0 } });
    if (!available(id) || one(list, 18, 0)?.value === 1) return track;
    return join([...list.filter(f => !(f.number === 18 && f.wire === 0)).map(f => f.raw), scalar(18, 1)]);
  }
  function metadata(input) {
    const classic = /\/metadata\/4\/track\/([a-f0-9]{32})(?:[?#]|$)/i.exec(url);
    if (classic) {
      const gid = one(fields(input), 1)?.payload;
      if (gid?.length !== 16 || Array.from(gid, b => b.toString(16).padStart(2, "0")).join("") !== classic[1].toLowerCase()) return input;
      return nativeTrack(input);
    }
    return mapMessage(input, array => {
      if (array.number !== 2 || array.wire !== 2 || one(fields(array.payload), 2, 0)?.value !== 10) return;
      return mapMessage(array.payload, entry => {
        if (entry.number !== 3 || entry.wire !== 2) return;
        const match = /^spotify:track:([A-Za-z0-9]{22})$/.exec(str(fields(entry.payload), 2));
        if (!match) return;
        return mapMessage(entry.payload, any => {
          if (any.number !== 3 || any.wire !== 2) return;
          return mapMessage(any.payload, f => f.number === 2 && f.wire === 2 ? nativeTrack(f.payload, match[1]) : undefined);
        });
      });
    });
  }
  function playerState(input) {
    return mapMessage(input, state => {
      if (state.number !== 3 || state.wire !== 2) return;
      return mapMessage(state.payload, track => {
        if (track.number !== 7 || track.wire !== 2) return;
        const list = fields(track.payload), match = /^spotify:track:([A-Za-z0-9]{22})$/.exec(str(list, 1));
        if (!match || !available(match[1])) return;
        const isFlag = f => f.number === 3 && f.wire === 2 && str(fields(f.payload), 1) === "has_lyrics";
        if (list.some(f => isFlag(f) && str(fields(f.payload), 2) === "true")) return;
        return join([...list.filter(f => !isFlag(f)).map(f => f.raw), blob(3, join([string(1, "has_lyrics"), string(2, "true")]))]);
      });
    });
  }
  async function scroll(input) {
    const top = fields(input), wrapper = top.filter(f => f.number === 1 && f.wire === 2);
    if (wrapper.length !== 1) return input;
    const kept = [], list = fields(wrapper[0].payload); let hasLyrics = false;
    for (const f of list) {
      if (f.number === 1 && f.wire === 2) {
        const section = fields(f.payload);
        if (section.some(s => s.number === 30 && s.wire === 2)) continue;
        if (section.some(s => s.number === 5 && s.wire === 2)) hasLyrics = true;
      }
      kept.push(f.raw);
    }
    const id = /\/scrollsita\/v1\/scroll\/spotify:track:([A-Za-z0-9]{22})(?:[?#]|$)/.exec(url)?.[1];
    if (enabled && id && !hasLyrics) {
      try {
        if (await external(id)) kept.unshift(blob(1, join([blob(5, string(1, "spotify:track:" + id)), blob(23, string(1, "spotify:section:0JQ5DB6s3cssW5Bo6cGq21"))])));
      } catch (_) { console.log("Spotify lyrics: card lookup unavailable"); }
    }
    return join(top.map(f => f === wrapper[0] ? blob(1, join(kept)) : f.raw));
  }
  function readLyrics(input) {
    const top = fields(input), lyric = one(top, 1);
    if (!lyric) return null;
    const list = fields(lyric.payload), lineFields = list.filter(f => f.number === 2 && f.wire === 2);
    if (lineFields.length > MAX_LINES) return null;
    const lines = lineFields.map(f => { const row = fields(f.payload); return { start: one(row, 1, 0)?.value || 0, words: str(row, 2) }; });
    const alternatives = list.filter(f => f.number === 9 && f.wire === 2).map(f => { const row = fields(f.payload); return { language: str(row, 1), lines: row.filter(x => x.number === 2 && x.wire === 2).map(x => text(x.payload)) }; });
    return { top, lyric, list, lines, alternatives };
  }
  const alternative = value => blob(9, join([string(1, value.language), ...value.lines.map(line => string(2, line))]));
  function encodeLyrics(result) {
    return join([
      scalar(1, result.sync),
      ...result.lines.map(line => blob(2, join([scalar(1, line.start), string(2, line.words), ...(line.syllables || []).map(s => blob(3, join([scalar(1, Number(s.startTimeMs)), scalar(2, s.numChars)])))]))),
      string(3, result.provider), string(4, result.providerId), string(5, result.provider),
      scalar(8, Number(result.alternatives.length > 0)), ...result.alternatives.map(alternative),
    ]);
  }
  function response(body, status, format) {
    const headers = { ...($response.headers || {}) };
    for (const key of Object.keys(headers)) if (["content-length", "content-encoding", "transfer-encoding", "content-type", "etag"].includes(key.toLowerCase())) delete headers[key];
    headers["Content-Type"] = format === "json" ? "application/json; charset=utf-8" : "application/x-protobuf";
    headers["Cache-Control"] = "private, no-store";
    return { status, headers, body };
  }
  async function lyrics(input, status, id) {
    const accept = header($request.headers, "accept"), contentType = header($response.headers, "content-type");
    const format = /[?&]format=json(?:&|$)/.test(url) || /application\/json/i.test(accept) || (status === 200 && /application\/json/i.test(contentType)) ? "json" : "proto";
    let document, native;
    if (status === 200) {
      if (format === "json") {
        document = JSON.parse(text(input));
        const lines = document.lyrics?.lines;
        if (Array.isArray(lines) && lines.length <= MAX_LINES && lines.some(line => String(line.words || "").trim())) native = { lines: lines.map(line => ({ start: Number(line.startTimeMs) || 0, words: String(line.words || "") })), alternatives: document.lyrics.alternatives || [] };
      } else native = readLyrics(input);
      if (native && !native.lines.some(line => line.words.trim())) native = null;
    }
    if (native) {
      let translated;
      try { translated = await translations(id, native.lines, native.alternatives); } catch (_) { console.log("Spotify lyrics: translation unavailable"); }
      if (!translated) return {};
      const extra = { language: languageKey(target), lines: translated };
      if (format === "json") {
        document.lyrics.alternatives = [...native.alternatives, extra]; document.lyrics.showTranslation = true;
        return response(utf8(JSON.stringify(document)), 200, format);
      }
      const payload = join([...native.list.filter(f => !(f.number === 8 && f.wire === 0)).map(f => f.raw), scalar(8, 1), alternative(extra)]);
      return response(join(native.top.map(f => f === native.lyric ? blob(1, payload) : f.raw)), 200, format);
    }
    const result = await external(id);
    if (!result) return {};
    // Clone cached data so a request with translation disabled cannot erase it.
    const output = { ...result, alternatives: translate ? [...result.alternatives] : [] };
    if (translate) {
      try { const translated = await translations(id, result.lines, output.alternatives); if (translated) output.alternatives.push({ language: languageKey(target), lines: translated }); }
      catch (_) { console.log("Spotify lyrics: translation unavailable"); }
    }
    if (format === "json") return response(utf8(JSON.stringify({ lyrics: {
      syncType: ["UNSYNCED", "LINE_SYNCED", "SYLLABLE_SYNCED"][output.sync],
      lines: output.lines.map(line => ({ startTimeMs: String(line.start), words: line.words, syllables: line.syllables || [], endTimeMs: String(line.end || 0) })),
      provider: output.provider, providerLyricsId: output.providerId, providerDisplayName: output.provider, alternatives: output.alternatives, showTranslation: output.alternatives.length > 0,
    }, colors: { background: -16777216, text: -1, highlightText: -1 }, hasVocalRemoval: false })), 200, format);
    const colors = join([int32(1, -16777216), int32(2, -1), int32(3, -1)]);
    return response(join([blob(1, encodeLyrics(output)), blob(2, colors), scalar(3, 0)]), 200, format);
  }
  (async () => {
    try {
      if (!/^https:\/\/(?:[A-Za-z0-9-]+-)?spclient(?:\.wg)?\.spotify\.com(?::443)?\//.test(url)) return $done({});
      const status = Number($response.status || $response.statusCode);
      const input = $response.body === undefined ? new Uint8Array() : bytes($response.body);
      const id = /\/color-lyrics\/v2\/track\/([A-Za-z0-9]{22})(?:\/image\/[^/?#]+)?\/?(?:[?#]|$)/.exec(url)?.[1];
      if (enabled && id && (status === 200 || status === 404) && $request.method === "GET") return $done(await lyrics(input, status, id));
      if (status !== 200) return $done({});
      let output;
      if (/\/scrollsita\//.test(url)) output = await scroll(input);
      else if (enabled && /\/(?:extended-metadata\/|metadata\/4\/track\/)/.test(url)) output = metadata(input);
      else if (enabled && /\/connect-state\/v1\/devices\//.test(url)) output = playerState(input);
      const changed = output && (output.length !== input.length || output.some((b, i) => b !== input[i]));
      $done(changed ? response(output, 200, "proto") : {});
    } catch (_) {
      console.log("Spotify lyrics: response kept after lookup or format error");
      $done({});
    }
  })();
})();

}
function runSpotifyProto($done, $argument, $request, $response) {
let protobuf;
// Embedded protobufjs runtime used by the response patcher below.
!(function (g) {
  "use strict";
  !(function (r, e, t) {
    var i = (function t(i) {
      var n = e[i];
      return (
        n || r[i][0].call((n = e[i] = { exports: {} }), t, n, n.exports),
        n.exports
      );
    })(t[0]);
    ((protobuf = i.util.global.protobuf = i),
      "function" == typeof define &&
        define.amd &&
        define(["long"], function (t) {
          return (t && t.isLong && ((i.util.Long = t), i.configure()), i);
        }),
      "object" == typeof module &&
        module &&
        module.exports &&
        (module.exports = i));
  })(
    {
      1: [
        function (t, i, n) {
          i.exports = function (t, i) {
            var n = Array(arguments.length - 1),
              s = 0,
              r = 2,
              u = !0;
            for (; r < arguments.length; ) n[s++] = arguments[r++];
            return new Promise(function (r, e) {
              n[s] = function (t) {
                if (u)
                  if (((u = !1), t)) e(t);
                  else {
                    for (
                      var i = Array(arguments.length - 1), n = 0;
                      n < i.length;

                    )
                      i[n++] = arguments[n];
                    r.apply(null, i);
                  }
              };
              try {
                t.apply(i || null, n);
              } catch (t) {
                u && ((u = !1), e(t));
              }
            });
          };
        },
        {},
      ],
      2: [
        function (t, i, n) {
          n.length = function (t) {
            var i = t.length;
            if (!i) return 0;
            for (var n = 0; 1 < --i % 4 && "=" == (t[0 | i] || ""); ) ++n;
            return Math.ceil(3 * t.length) / 4 - n;
          };
          for (var f = Array(64), h = Array(123), r = 0; r < 64; )
            h[
              (f[r] =
                r < 26
                  ? r + 65
                  : r < 52
                    ? r + 71
                    : r < 62
                      ? r - 4
                      : (r - 59) | 43)
            ] = r++;
          n.encode = function (t, i, n) {
            for (var r, e = null, s = [], u = 0, o = 0; i < n; ) {
              var h = t[i++];
              switch (o) {
                case 0:
                  ((s[u++] = f[h >> 2]), (r = (3 & h) << 4), (o = 1));
                  break;
                case 1:
                  ((s[u++] = f[r | (h >> 4)]), (r = (15 & h) << 2), (o = 2));
                  break;
                case 2:
                  ((s[u++] = f[r | (h >> 6)]), (s[u++] = f[63 & h]), (o = 0));
              }
              8191 < u &&
                ((e = e || []).push(String.fromCharCode.apply(String, s)),
                (u = 0));
            }
            return (
              o && ((s[u++] = f[r]), (s[u++] = 61), 1 === o && (s[u++] = 61)),
              e
                ? (u &&
                    e.push(String.fromCharCode.apply(String, s.slice(0, u))),
                  e.join(""))
                : String.fromCharCode.apply(String, s.slice(0, u))
            );
          };
          var c = "invalid encoding";
          ((n.decode = function (t, i, n) {
            for (var r, e = n, s = 0, u = 0; u < t.length; ) {
              var o = t.charCodeAt(u++);
              if (61 == o && 1 < s) break;
              if ((o = h[o]) === g) throw Error(c);
              switch (s) {
                case 0:
                  ((r = o), (s = 1));
                  break;
                case 1:
                  ((i[n++] = (r << 2) | ((48 & o) >> 4)), (r = o), (s = 2));
                  break;
                case 2:
                  ((i[n++] = ((15 & r) << 4) | ((60 & o) >> 2)),
                    (r = o),
                    (s = 3));
                  break;
                case 3:
                  ((i[n++] = ((3 & r) << 6) | o), (s = 0));
              }
            }
            if (1 === s) throw Error(c);
            return n - e;
          }),
            (n.test = function (t) {
              return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
                t,
              );
            }));
        },
        {},
      ],
      3: [
        function (t, i, n) {
          function a(i, n) {
            "string" == typeof i && ((n = i), (i = g));
            var h = [];
            function f(t) {
              if ("string" != typeof t) {
                var i = c();
                if (
                  (a.verbose && console.log("codegen: " + i),
                  (i = "return " + i),
                  t)
                ) {
                  for (
                    var n = Object.keys(t),
                      r = Array(n.length + 1),
                      e = Array(n.length),
                      s = 0;
                    s < n.length;

                  )
                    ((r[s] = n[s]), (e[s] = t[n[s++]]));
                  return ((r[s] = i), Function.apply(null, r).apply(null, e));
                }
                return Function(i)();
              }
              for (var u = Array(arguments.length - 1), o = 0; o < u.length; )
                u[o] = arguments[++o];
              if (
                ((o = 0),
                (t = t.replace(/%([%dfijs])/g, function (t, i) {
                  var n = u[o++];
                  switch (i) {
                    case "d":
                    case "f":
                      return "" + +("" + n);
                    case "i":
                      return "" + Math.floor(n);
                    case "j":
                      return JSON.stringify(n);
                    case "s":
                      return "" + n;
                  }
                  return "%";
                })),
                o !== u.length)
              )
                throw Error("parameter count mismatch");
              return (h.push(t), f);
            }
            function c(t) {
              return (
                "function " +
                (t || n || "") +
                "(" +
                ((i && i.join(",")) || "") +
                "){\n  " +
                h.join("\n  ") +
                "\n}"
              );
            }
            return ((f.toString = c), f);
          }
          (i.exports = a).verbose = !1;
        },
        {},
      ],
      4: [
        function (t, i, n) {
          function r() {
            this.t = {};
          }
          (((i.exports = r).prototype.on = function (t, i, n) {
            return (
              (this.t[t] || (this.t[t] = [])).push({ fn: i, ctx: n || this }),
              this
            );
          }),
            (r.prototype.off = function (t, i) {
              if (t === g) this.t = {};
              else if (i === g) this.t[t] = [];
              else
                for (var n = this.t[t], r = 0; r < n.length; )
                  n[r].fn === i ? n.splice(r, 1) : ++r;
              return this;
            }),
            (r.prototype.emit = function (t) {
              var i = this.t[t];
              if (i) {
                for (var n = [], r = 1; r < arguments.length; )
                  n.push(arguments[r++]);
                for (r = 0; r < i.length; ) i[r].fn.apply(i[r++].ctx, n);
              }
              return this;
            }));
        },
        {},
      ],
      5: [
        function (t, i, n) {
          i.exports = o;
          var s = t(1),
            u = t(7)("fs");
          function o(n, r, e) {
            return (
              (r = "function" == typeof r ? ((e = r), {}) : r || {}),
              e
                ? !r.xhr && u && u.readFile
                  ? u.readFile(n, function (t, i) {
                      return t && "undefined" != typeof XMLHttpRequest
                        ? o.xhr(n, r, e)
                        : t
                          ? e(t)
                          : e(null, r.binary ? i : i.toString("utf8"));
                    })
                  : o.xhr(n, r, e)
                : s(o, this, n, r)
            );
          }
          o.xhr = function (t, n, r) {
            var e = new XMLHttpRequest();
            ((e.onreadystatechange = function () {
              if (4 !== e.readyState) return g;
              if (0 !== e.status && 200 !== e.status)
                return r(Error("status " + e.status));
              if (n.binary) {
                if (!(t = e.response))
                  for (var t = [], i = 0; i < e.responseText.length; ++i)
                    t.push(255 & e.responseText.charCodeAt(i));
                return r(
                  null,
                  "undefined" != typeof Uint8Array ? new Uint8Array(t) : t,
                );
              }
              return r(null, e.responseText);
            }),
              n.binary &&
                ("overrideMimeType" in e &&
                  e.overrideMimeType("text/plain; charset=x-user-defined"),
                (e.responseType = "arraybuffer")),
              e.open("GET", t),
              e.send());
          };
        },
        { 1: 1, 7: 7 },
      ],
      6: [
        function (t, i, n) {
          function r(t) {
            function i(t, i, n, r) {
              var e = i < 0 ? 1 : 0;
              t(
                0 === (i = e ? -i : i)
                  ? 0 < 1 / i
                    ? 0
                    : 2147483648
                  : isNaN(i)
                    ? 2143289344
                    : 34028234663852886e22 < i
                      ? ((e << 31) | 2139095040) >>> 0
                      : i < 11754943508222875e-54
                        ? ((e << 31) | Math.round(i / 1401298464324817e-60)) >>>
                          0
                        : ((e << 31) |
                            ((127 + (t = Math.floor(Math.log(i) / Math.LN2))) <<
                              23) |
                            (8388607 &
                              Math.round(i * Math.pow(2, -t) * 8388608))) >>>
                          0,
                n,
                r,
              );
            }
            function n(t, i, n) {
              ((t = t(i, n)),
                (i = 2 * (t >> 31) + 1),
                (n = (t >>> 23) & 255),
                (t &= 8388607));
              return 255 == n
                ? t
                  ? NaN
                  : (1 / 0) * i
                : 0 == n
                  ? 1401298464324817e-60 * i * t
                  : i * Math.pow(2, n - 150) * (8388608 + t);
            }
            function r(t, i, n) {
              ((o[0] = t),
                (i[n] = h[0]),
                (i[n + 1] = h[1]),
                (i[n + 2] = h[2]),
                (i[n + 3] = h[3]));
            }
            function e(t, i, n) {
              ((o[0] = t),
                (i[n] = h[3]),
                (i[n + 1] = h[2]),
                (i[n + 2] = h[1]),
                (i[n + 3] = h[0]));
            }
            function s(t, i) {
              return (
                (h[0] = t[i]),
                (h[1] = t[i + 1]),
                (h[2] = t[i + 2]),
                (h[3] = t[i + 3]),
                o[0]
              );
            }
            function u(t, i) {
              return (
                (h[3] = t[i]),
                (h[2] = t[i + 1]),
                (h[1] = t[i + 2]),
                (h[0] = t[i + 3]),
                o[0]
              );
            }
            var o, h, f, c, a;
            function l(t, i, n, r, e, s) {
              var u,
                o = r < 0 ? 1 : 0;
              0 === (r = o ? -r : r)
                ? (t(0, e, s + i), t(0 < 1 / r ? 0 : 2147483648, e, s + n))
                : isNaN(r)
                  ? (t(0, e, s + i), t(2146959360, e, s + n))
                  : 17976931348623157e292 < r
                    ? (t(0, e, s + i),
                      t(((o << 31) | 2146435072) >>> 0, e, s + n))
                    : r < 22250738585072014e-324
                      ? (t((u = r / 5e-324) >>> 0, e, s + i),
                        t(((o << 31) | (u / 4294967296)) >>> 0, e, s + n))
                      : (t(
                          (4503599627370496 *
                            (u =
                              r *
                              Math.pow(
                                2,
                                -(r =
                                  1024 ===
                                  (r = Math.floor(Math.log(r) / Math.LN2))
                                    ? 1023
                                    : r),
                              ))) >>>
                            0,
                          e,
                          s + i,
                        ),
                        t(
                          ((o << 31) |
                            ((r + 1023) << 20) |
                            ((1048576 * u) & 1048575)) >>>
                            0,
                          e,
                          s + n,
                        ));
            }
            function d(t, i, n, r, e) {
              ((i = t(r, e + i)),
                (t = t(r, e + n)),
                (r = 2 * (t >> 31) + 1),
                (e = (t >>> 20) & 2047),
                (n = 4294967296 * (1048575 & t) + i));
              return 2047 == e
                ? n
                  ? NaN
                  : (1 / 0) * r
                : 0 == e
                  ? 5e-324 * r * n
                  : r * Math.pow(2, e - 1075) * (n + 4503599627370496);
            }
            function v(t, i, n) {
              ((f[0] = t),
                (i[n] = c[0]),
                (i[n + 1] = c[1]),
                (i[n + 2] = c[2]),
                (i[n + 3] = c[3]),
                (i[n + 4] = c[4]),
                (i[n + 5] = c[5]),
                (i[n + 6] = c[6]),
                (i[n + 7] = c[7]));
            }
            function b(t, i, n) {
              ((f[0] = t),
                (i[n] = c[7]),
                (i[n + 1] = c[6]),
                (i[n + 2] = c[5]),
                (i[n + 3] = c[4]),
                (i[n + 4] = c[3]),
                (i[n + 5] = c[2]),
                (i[n + 6] = c[1]),
                (i[n + 7] = c[0]));
            }
            function p(t, i) {
              return (
                (c[0] = t[i]),
                (c[1] = t[i + 1]),
                (c[2] = t[i + 2]),
                (c[3] = t[i + 3]),
                (c[4] = t[i + 4]),
                (c[5] = t[i + 5]),
                (c[6] = t[i + 6]),
                (c[7] = t[i + 7]),
                f[0]
              );
            }
            function y(t, i) {
              return (
                (c[7] = t[i]),
                (c[6] = t[i + 1]),
                (c[5] = t[i + 2]),
                (c[4] = t[i + 3]),
                (c[3] = t[i + 4]),
                (c[2] = t[i + 5]),
                (c[1] = t[i + 6]),
                (c[0] = t[i + 7]),
                f[0]
              );
            }
            return (
              "undefined" != typeof Float32Array
                ? ((o = new Float32Array([-0])),
                  (h = new Uint8Array(o.buffer)),
                  (a = 128 === h[3]),
                  (t.writeFloatLE = a ? r : e),
                  (t.writeFloatBE = a ? e : r),
                  (t.readFloatLE = a ? s : u),
                  (t.readFloatBE = a ? u : s))
                : ((t.writeFloatLE = i.bind(null, m)),
                  (t.writeFloatBE = i.bind(null, w)),
                  (t.readFloatLE = n.bind(null, g)),
                  (t.readFloatBE = n.bind(null, j))),
              "undefined" != typeof Float64Array
                ? ((f = new Float64Array([-0])),
                  (c = new Uint8Array(f.buffer)),
                  (a = 128 === c[7]),
                  (t.writeDoubleLE = a ? v : b),
                  (t.writeDoubleBE = a ? b : v),
                  (t.readDoubleLE = a ? p : y),
                  (t.readDoubleBE = a ? y : p))
                : ((t.writeDoubleLE = l.bind(null, m, 0, 4)),
                  (t.writeDoubleBE = l.bind(null, w, 4, 0)),
                  (t.readDoubleLE = d.bind(null, g, 0, 4)),
                  (t.readDoubleBE = d.bind(null, j, 4, 0))),
              t
            );
          }
          function m(t, i, n) {
            ((i[n] = 255 & t),
              (i[n + 1] = (t >>> 8) & 255),
              (i[n + 2] = (t >>> 16) & 255),
              (i[n + 3] = t >>> 24));
          }
          function w(t, i, n) {
            ((i[n] = t >>> 24),
              (i[n + 1] = (t >>> 16) & 255),
              (i[n + 2] = (t >>> 8) & 255),
              (i[n + 3] = 255 & t));
          }
          function g(t, i) {
            return (
              (t[i] | (t[i + 1] << 8) | (t[i + 2] << 16) | (t[i + 3] << 24)) >>>
              0
            );
          }
          function j(t, i) {
            return (
              ((t[i] << 24) | (t[i + 1] << 16) | (t[i + 2] << 8) | t[i + 3]) >>>
              0
            );
          }
          i.exports = r(r);
        },
        {},
      ],
      7: [
        function (t, i, n) {
          function r(t) {
            try {
              var i = eval("require")(t);
              if (i && (i.length || Object.keys(i).length)) return i;
            } catch (t) {}
            return null;
          }
          i.exports = r;
        },
        {},
      ],
      8: [
        function (t, i, n) {
          var e = (n.isAbsolute = function (t) {
              return /^(?:\/|\w+:)/.test(t);
            }),
            r = (n.normalize = function (t) {
              var i = (t = t.replace(/\\/g, "/").replace(/\/{2,}/g, "/")).split(
                  "/",
                ),
                n = e(t),
                t = "";
              n && (t = i.shift() + "/");
              for (var r = 0; r < i.length; )
                ".." === i[r]
                  ? 0 < r && ".." !== i[r - 1]
                    ? i.splice(--r, 2)
                    : n
                      ? i.splice(r, 1)
                      : ++r
                  : "." === i[r]
                    ? i.splice(r, 1)
                    : ++r;
              return t + i.join("/");
            });
          n.resolve = function (t, i, n) {
            return (
              n || (i = r(i)),
              !e(i) &&
              (t = (t = n ? t : r(t)).replace(/(?:\/|^)[^/]+$/, "")).length
                ? r(t + "/" + i)
                : i
            );
          };
        },
        {},
      ],
      9: [
        function (t, i, n) {
          i.exports = function (i, n, t) {
            var r = t || 8192,
              e = r >>> 1,
              s = null,
              u = r;
            return function (t) {
              if (t < 1 || e < t) return i(t);
              r < u + t && ((s = i(r)), (u = 0));
              t = n.call(s, u, (u += t));
              return (7 & u && (u = 1 + (7 | u)), t);
            };
          };
        },
        {},
      ],
      10: [
        function (t, i, n) {
          ((n.length = function (t) {
            for (var i, n = 0, r = 0; r < t.length; ++r)
              (i = t.charCodeAt(r)) < 128
                ? (n += 1)
                : i < 2048
                  ? (n += 2)
                  : 55296 == (64512 & i) &&
                      56320 == (64512 & t.charCodeAt(r + 1))
                    ? (++r, (n += 4))
                    : (n += 3);
            return n;
          }),
            (n.read = function (t, i, n) {
              if (n - i < 1) return "";
              for (var r, e = null, s = [], u = 0; i < n; )
                ((r = t[i++]) < 128
                  ? (s[u++] = r)
                  : 191 < r && r < 224
                    ? (s[u++] = ((31 & r) << 6) | (63 & t[i++]))
                    : 239 < r && r < 365
                      ? ((r =
                          (((7 & r) << 18) |
                            ((63 & t[i++]) << 12) |
                            ((63 & t[i++]) << 6) |
                            (63 & t[i++])) -
                          65536),
                        (s[u++] = 55296 + (r >> 10)),
                        (s[u++] = 56320 + (1023 & r)))
                      : (s[u++] =
                          ((15 & r) << 12) |
                          ((63 & t[i++]) << 6) |
                          (63 & t[i++])),
                  8191 < u &&
                    ((e = e || []).push(String.fromCharCode.apply(String, s)),
                    (u = 0)));
              return e
                ? (u &&
                    e.push(String.fromCharCode.apply(String, s.slice(0, u))),
                  e.join(""))
                : String.fromCharCode.apply(String, s.slice(0, u));
            }),
            (n.write = function (t, i, n) {
              for (var r, e, s = n, u = 0; u < t.length; ++u)
                (r = t.charCodeAt(u)) < 128
                  ? (i[n++] = r)
                  : (r < 2048
                      ? (i[n++] = (r >> 6) | 192)
                      : (55296 == (64512 & r) &&
                        56320 == (64512 & (e = t.charCodeAt(u + 1)))
                          ? (++u,
                            (i[n++] =
                              ((r = 65536 + ((1023 & r) << 10) + (1023 & e)) >>
                                18) |
                              240),
                            (i[n++] = ((r >> 12) & 63) | 128))
                          : (i[n++] = (r >> 12) | 224),
                        (i[n++] = ((r >> 6) & 63) | 128)),
                    (i[n++] = (63 & r) | 128));
              return n - s;
            }));
        },
        {},
      ],
      11: [
        function (t, i, n) {
          var l = t(14),
            d = t(33);
          function u(t, i, n, r) {
            var e = !1;
            if (i.resolvedType)
              if (i.resolvedType instanceof l) {
                t("switch(d%s){", r);
                for (
                  var s = i.resolvedType.values, u = Object.keys(s), o = 0;
                  o < u.length;
                  ++o
                )
                  (s[u[o]] !== i.typeDefault ||
                    e ||
                    (t("default:")(
                      'if(typeof(d%s)==="number"){m%s=d%s;break}',
                      r,
                      r,
                      r,
                    ),
                    i.repeated || t("break"),
                    (e = !0)),
                    t("case%j:", u[o])("case %i:", s[u[o]])(
                      "m%s=%j",
                      r,
                      s[u[o]],
                    )("break"));
                t("}");
              } else
                t('if(typeof d%s!=="object")', r)(
                  "throw TypeError(%j)",
                  i.fullName + ": object expected",
                )("m%s=types[%i].fromObject(d%s)", r, n, r);
            else {
              var h = !1;
              switch (i.type) {
                case "double":
                case "float":
                  t("m%s=Number(d%s)", r, r);
                  break;
                case "uint32":
                case "fixed32":
                  t("m%s=d%s>>>0", r, r);
                  break;
                case "int32":
                case "sint32":
                case "sfixed32":
                  t("m%s=d%s|0", r, r);
                  break;
                case "uint64":
                  h = !0;
                case "int64":
                case "sint64":
                case "fixed64":
                case "sfixed64":
                  t("if(util.Long)")(
                    "(m%s=util.Long.fromValue(d%s)).unsigned=%j",
                    r,
                    r,
                    h,
                  )('else if(typeof d%s==="string")', r)(
                    "m%s=parseInt(d%s,10)",
                    r,
                    r,
                  )('else if(typeof d%s==="number")', r)(
                    "m%s=d%s",
                    r,
                    r,
                  )('else if(typeof d%s==="object")', r)(
                    "m%s=new util.LongBits(d%s.low>>>0,d%s.high>>>0).toNumber(%s)",
                    r,
                    r,
                    r,
                    h ? "true" : "",
                  );
                  break;
                case "bytes":
                  t('if(typeof d%s==="string")', r)(
                    "util.base64.decode(d%s,m%s=util.newBuffer(util.base64.length(d%s)),0)",
                    r,
                    r,
                    r,
                  )("else if(d%s.length >= 0)", r)("m%s=d%s", r, r);
                  break;
                case "string":
                  t("m%s=String(d%s)", r, r);
                  break;
                case "bool":
                  t("m%s=Boolean(d%s)", r, r);
              }
            }
            return t;
          }
          function v(t, i, n, r) {
            if (i.resolvedType)
              i.resolvedType instanceof l
                ? t(
                    "d%s=o.enums===String?(types[%i].values[m%s]===undefined?m%s:types[%i].values[m%s]):m%s",
                    r,
                    n,
                    r,
                    r,
                    n,
                    r,
                    r,
                  )
                : t("d%s=types[%i].toObject(m%s,o)", r, n, r);
            else {
              var e = !1;
              switch (i.type) {
                case "double":
                case "float":
                  t("d%s=o.json&&!isFinite(m%s)?String(m%s):m%s", r, r, r, r);
                  break;
                case "uint64":
                  e = !0;
                case "int64":
                case "sint64":
                case "fixed64":
                case "sfixed64":
                  t('if(typeof m%s==="number")', r)(
                    "d%s=o.longs===String?String(m%s):m%s",
                    r,
                    r,
                    r,
                  )("else")(
                    "d%s=o.longs===String?util.Long.prototype.toString.call(m%s):o.longs===Number?new util.LongBits(m%s.low>>>0,m%s.high>>>0).toNumber(%s):m%s",
                    r,
                    r,
                    r,
                    r,
                    e ? "true" : "",
                    r,
                  );
                  break;
                case "bytes":
                  t(
                    "d%s=o.bytes===String?util.base64.encode(m%s,0,m%s.length):o.bytes===Array?Array.prototype.slice.call(m%s):m%s",
                    r,
                    r,
                    r,
                    r,
                    r,
                  );
                  break;
                default:
                  t("d%s=m%s", r, r);
              }
            }
            return t;
          }
          ((n.fromObject = function (t) {
            var i = t.fieldsArray,
              n = d.codegen(
                ["d"],
                t.name + "$fromObject",
              )("if(d instanceof this.ctor)")("return d");
            if (!i.length) return n("return new this.ctor");
            n("var m=new this.ctor");
            for (var r = 0; r < i.length; ++r) {
              var e = i[r].resolve(),
                s = d.safeProp(e.name);
              e.map
                ? (n("if(d%s){", s)('if(typeof d%s!=="object")', s)(
                    "throw TypeError(%j)",
                    e.fullName + ": object expected",
                  )("m%s={}", s)(
                    "for(var ks=Object.keys(d%s),i=0;i<ks.length;++i){",
                    s,
                  ),
                  u(n, e, r, s + "[ks[i]]")("}")("}"))
                : e.repeated
                  ? (n("if(d%s){", s)("if(!Array.isArray(d%s))", s)(
                      "throw TypeError(%j)",
                      e.fullName + ": array expected",
                    )("m%s=[]", s)("for(var i=0;i<d%s.length;++i){", s),
                    u(n, e, r, s + "[i]")("}")("}"))
                  : (e.resolvedType instanceof l || n("if(d%s!=null){", s),
                    u(n, e, r, s),
                    e.resolvedType instanceof l || n("}"));
            }
            return n("return m");
          }),
            (n.toObject = function (t) {
              var i = t.fieldsArray.slice().sort(d.compareFieldsById);
              if (!i.length) return d.codegen()("return {}");
              for (
                var n = d.codegen(["m", "o"], t.name + "$toObject")("if(!o)")(
                    "o={}",
                  )("var d={}"),
                  r = [],
                  e = [],
                  s = [],
                  u = 0;
                u < i.length;
                ++u
              )
                i[u].partOf ||
                  (i[u].resolve().repeated ? r : i[u].map ? e : s).push(i[u]);
              if (r.length) {
                for (n("if(o.arrays||o.defaults){"), u = 0; u < r.length; ++u)
                  n("d%s=[]", d.safeProp(r[u].name));
                n("}");
              }
              if (e.length) {
                for (n("if(o.objects||o.defaults){"), u = 0; u < e.length; ++u)
                  n("d%s={}", d.safeProp(e[u].name));
                n("}");
              }
              if (s.length) {
                for (n("if(o.defaults){"), u = 0; u < s.length; ++u) {
                  var o,
                    h = s[u],
                    f = d.safeProp(h.name);
                  h.resolvedType instanceof l
                    ? n(
                        "d%s=o.enums===String?%j:%j",
                        f,
                        h.resolvedType.valuesById[h.typeDefault],
                        h.typeDefault,
                      )
                    : h.long
                      ? n("if(util.Long){")(
                          "var n=new util.Long(%i,%i,%j)",
                          h.typeDefault.low,
                          h.typeDefault.high,
                          h.typeDefault.unsigned,
                        )(
                          "d%s=o.longs===String?n.toString():o.longs===Number?n.toNumber():n",
                          f,
                        )("}else")(
                          "d%s=o.longs===String?%j:%i",
                          f,
                          h.typeDefault.toString(),
                          h.typeDefault.toNumber(),
                        )
                      : h.bytes
                        ? ((o =
                            "[" +
                            Array.prototype.slice
                              .call(h.typeDefault)
                              .join(",") +
                            "]"),
                          n(
                            "if(o.bytes===String)d%s=%j",
                            f,
                            String.fromCharCode.apply(String, h.typeDefault),
                          )("else{")("d%s=%s", f, o)(
                            "if(o.bytes!==Array)d%s=util.newBuffer(d%s)",
                            f,
                            f,
                          )("}"))
                        : n("d%s=%j", f, h.typeDefault);
                }
                n("}");
              }
              for (var c = !1, u = 0; u < i.length; ++u) {
                var h = i[u],
                  a = t.i.indexOf(h),
                  f = d.safeProp(h.name);
                (h.map
                  ? (c || ((c = !0), n("var ks2")),
                    n(
                      "if(m%s&&(ks2=Object.keys(m%s)).length){",
                      f,
                      f,
                    )(
                      "d%s={}",
                      f,
                    )("for(var j=0;j<ks2.length;++j){"),
                    v(n, h, a, f + "[ks2[j]]")("}"))
                  : h.repeated
                    ? (n("if(m%s&&m%s.length){", f, f)("d%s=[]", f)(
                        "for(var j=0;j<m%s.length;++j){",
                        f,
                      ),
                      v(n, h, a, f + "[j]")("}"))
                    : (n("if(m%s!=null&&m.hasOwnProperty(%j)){", f, h.name),
                      v(n, h, a, f),
                      h.partOf &&
                        n("if(o.oneofs)")(
                          "d%s=%j",
                          d.safeProp(h.partOf.name),
                          h.name,
                        )),
                  n("}"));
              }
              return n("return d");
            }));
        },
        { 14: 14, 33: 33 },
      ],
      12: [
        function (t, i, n) {
          i.exports = function (t) {
            var i = f.codegen(
              ["r", "l"],
              t.name + "$decode",
            )("if(!(r instanceof Reader))")("r=Reader.create(r)")(
              "var c=l===undefined?r.len:r.pos+l,m=new this.ctor" +
                (t.fieldsArray.filter(function (t) {
                  return t.map;
                }).length
                  ? ",k,value"
                  : ""),
            )("while(r.pos<c){")("var t=r.uint32()");
            t.group && i("if((t&7)===4)")("break");
            i("switch(t>>>3){");
            for (var n = 0; n < t.fieldsArray.length; ++n) {
              var r = t.i[n].resolve(),
                e = r.resolvedType instanceof o ? "int32" : r.type,
                s = "m" + f.safeProp(r.name);
              (i("case %i: {", r.id),
                r.map
                  ? (i("if(%s===util.emptyObject)", s)("%s={}", s)(
                      "var c2 = r.uint32()+r.pos",
                    ),
                    h.defaults[r.keyType] !== g
                      ? i("k=%j", h.defaults[r.keyType])
                      : i("k=null"),
                    h.defaults[e] !== g
                      ? i("value=%j", h.defaults[e])
                      : i("value=null"),
                    i("while(r.pos<c2){")("var tag2=r.uint32()")(
                      "switch(tag2>>>3){",
                    )(
                      "case 1: k=r.%s(); break",
                      r.keyType,
                    )("case 2:"),
                    h.basic[e] === g
                      ? i("value=types[%i].decode(r,r.uint32())", n)
                      : i("value=r.%s()", e),
                    i("break")("default:")("r.skipType(tag2&7)")("break")("}")(
                      "}",
                    ),
                    h.long[r.keyType] !== g
                      ? i(
                          '%s[typeof k==="object"?util.longToHash(k):k]=value',
                          s,
                        )
                      : i("%s[k]=value", s))
                  : r.repeated
                    ? (i("if(!(%s&&%s.length))", s, s)("%s=[]", s),
                      h.packed[e] !== g &&
                        i("if((t&7)===2){")("var c2=r.uint32()+r.pos")(
                          "while(r.pos<c2)",
                        )(
                          "%s.push(r.%s())",
                          s,
                          e,
                        )("}else"),
                      h.basic[e] === g
                        ? i(
                            r.resolvedType.group
                              ? "%s.push(types[%i].decode(r))"
                              : "%s.push(types[%i].decode(r,r.uint32()))",
                            s,
                            n,
                          )
                        : i("%s.push(r.%s())", s, e))
                    : h.basic[e] === g
                      ? i(
                          r.resolvedType.group
                            ? "%s=types[%i].decode(r)"
                            : "%s=types[%i].decode(r,r.uint32())",
                          s,
                          n,
                        )
                      : i("%s=r.%s()", s, e),
                i("break")("}"));
            }
            for (
              i("default:")("r.skipType(t&7)")("break")("}")("}"), n = 0;
              n < t.i.length;
              ++n
            ) {
              var u = t.i[n];
              u.required &&
                i("if(!m.hasOwnProperty(%j))", u.name)(
                  "throw util.ProtocolError(%j,{instance:m})",
                  "missing required '" + u.name + "'",
                );
            }
            return i("return m");
          };
          var o = t(14),
            h = t(32),
            f = t(33);
        },
        { 14: 14, 32: 32, 33: 33 },
      ],
      13: [
        function (t, i, n) {
          i.exports = function (t) {
            for (
              var i,
                n = a.codegen(["m", "w"], t.name + "$encode")("if(!w)")(
                  "w=Writer.create()",
                ),
                r = t.fieldsArray.slice().sort(a.compareFieldsById),
                e = 0;
              e < r.length;
              ++e
            ) {
              var s = r[e].resolve(),
                u = t.i.indexOf(s),
                o = s.resolvedType instanceof f ? "int32" : s.type,
                h = c.basic[o];
              ((i = "m" + a.safeProp(s.name)),
                s.map
                  ? (n(
                      "if(%s!=null&&Object.hasOwnProperty.call(m,%j)){",
                      i,
                      s.name,
                    )("for(var ks=Object.keys(%s),i=0;i<ks.length;++i){", i)(
                      "w.uint32(%i).fork().uint32(%i).%s(ks[i])",
                      ((s.id << 3) | 2) >>> 0,
                      8 | c.mapKey[s.keyType],
                      s.keyType,
                    ),
                    h === g
                      ? n(
                          "types[%i].encode(%s[ks[i]],w.uint32(18).fork()).ldelim().ldelim()",
                          u,
                          i,
                        )
                      : n(".uint32(%i).%s(%s[ks[i]]).ldelim()", 16 | h, o, i),
                    n("}")("}"))
                  : s.repeated
                    ? (n("if(%s!=null&&%s.length){", i, i),
                      s.packed && c.packed[o] !== g
                        ? n("w.uint32(%i).fork()", ((s.id << 3) | 2) >>> 0)(
                            "for(var i=0;i<%s.length;++i)",
                            i,
                          )(
                            "w.%s(%s[i])",
                            o,
                            i,
                          )("w.ldelim()")
                        : (n("for(var i=0;i<%s.length;++i)", i),
                          h === g
                            ? l(n, s, u, i + "[i]")
                            : n(
                                "w.uint32(%i).%s(%s[i])",
                                ((s.id << 3) | h) >>> 0,
                                o,
                                i,
                              )),
                      n("}"))
                    : (s.optional &&
                        n(
                          "if(%s!=null&&Object.hasOwnProperty.call(m,%j))",
                          i,
                          s.name,
                        ),
                      h === g
                        ? l(n, s, u, i)
                        : n(
                            "w.uint32(%i).%s(%s)",
                            ((s.id << 3) | h) >>> 0,
                            o,
                            i,
                          )));
            }
            return n("return w");
          };
          var f = t(14),
            c = t(32),
            a = t(33);
          function l(t, i, n, r) {
            i.resolvedType.group
              ? t(
                  "types[%i].encode(%s,w.uint32(%i)).uint32(%i)",
                  n,
                  r,
                  ((i.id << 3) | 3) >>> 0,
                  ((i.id << 3) | 4) >>> 0,
                )
              : t(
                  "types[%i].encode(%s,w.uint32(%i).fork()).ldelim()",
                  n,
                  r,
                  ((i.id << 3) | 2) >>> 0,
                );
          }
        },
        { 14: 14, 32: 32, 33: 33 },
      ],
      14: [
        function (t, i, n) {
          i.exports = s;
          var h = t(22),
            r =
              ((((s.prototype = Object.create(h.prototype)).constructor =
                s).className = "Enum"),
              t(21)),
            e = t(33);
          function s(t, i, n, r, e, s) {
            if ((h.call(this, t, n), i && "object" != typeof i))
              throw TypeError("values must be an object");
            if (
              ((this.valuesById = {}),
              (this.values = Object.create(this.valuesById)),
              (this.comment = r),
              (this.comments = e || {}),
              (this.valuesOptions = s),
              (this.reserved = g),
              i)
            )
              for (var u = Object.keys(i), o = 0; o < u.length; ++o)
                "number" == typeof i[u[o]] &&
                  (this.valuesById[(this.values[u[o]] = i[u[o]])] = u[o]);
          }
          ((s.fromJSON = function (t, i) {
            t = new s(t, i.values, i.options, i.comment, i.comments);
            return ((t.reserved = i.reserved), t);
          }),
            (s.prototype.toJSON = function (t) {
              t = !!t && !!t.keepComments;
              return e.toObject([
                "options",
                this.options,
                "valuesOptions",
                this.valuesOptions,
                "values",
                this.values,
                "reserved",
                this.reserved && this.reserved.length ? this.reserved : g,
                "comment",
                t ? this.comment : g,
                "comments",
                t ? this.comments : g,
              ]);
            }),
            (s.prototype.add = function (t, i, n, r) {
              if (!e.isString(t)) throw TypeError("name must be a string");
              if (!e.isInteger(i)) throw TypeError("id must be an integer");
              if (this.values[t] !== g)
                throw Error("duplicate name '" + t + "' in " + this);
              if (this.isReservedId(i))
                throw Error("id " + i + " is reserved in " + this);
              if (this.isReservedName(t))
                throw Error("name '" + t + "' is reserved in " + this);
              if (this.valuesById[i] !== g) {
                if (!this.options || !this.options.allow_alias)
                  throw Error("duplicate id " + i + " in " + this);
                this.values[t] = i;
              } else this.valuesById[(this.values[t] = i)] = t;
              return (
                r &&
                  (this.valuesOptions === g && (this.valuesOptions = {}),
                  (this.valuesOptions[t] = r || null)),
                (this.comments[t] = n || null),
                this
              );
            }),
            (s.prototype.remove = function (t) {
              if (!e.isString(t)) throw TypeError("name must be a string");
              var i = this.values[t];
              if (null == i)
                throw Error("name '" + t + "' does not exist in " + this);
              return (
                delete this.valuesById[i],
                delete this.values[t],
                delete this.comments[t],
                this.valuesOptions && delete this.valuesOptions[t],
                this
              );
            }),
            (s.prototype.isReservedId = function (t) {
              return r.isReservedId(this.reserved, t);
            }),
            (s.prototype.isReservedName = function (t) {
              return r.isReservedName(this.reserved, t);
            }));
        },
        { 21: 21, 22: 22, 33: 33 },
      ],
      15: [
        function (t, i, n) {
          i.exports = u;
          var r,
            o = t(22),
            e =
              ((((u.prototype = Object.create(o.prototype)).constructor =
                u).className = "Field"),
              t(14)),
            h = t(32),
            f = t(33),
            c = /^required|optional|repeated$/;
          function u(t, i, n, r, e, s, u) {
            if (
              (f.isObject(r)
                ? ((u = e), (s = r), (r = e = g))
                : f.isObject(e) && ((u = s), (s = e), (e = g)),
              o.call(this, t, s),
              !f.isInteger(i) || i < 0)
            )
              throw TypeError("id must be a non-negative integer");
            if (!f.isString(n)) throw TypeError("type must be a string");
            if (r !== g && !c.test((r = r.toString().toLowerCase())))
              throw TypeError("rule must be a string rule");
            if (e !== g && !f.isString(e))
              throw TypeError("extend must be a string");
            ((this.rule =
              (r = "proto3_optional" === r ? "optional" : r) && "optional" !== r
                ? r
                : g),
              (this.type = n),
              (this.id = i),
              (this.extend = e || g),
              (this.required = "required" === r),
              (this.optional = !this.required),
              (this.repeated = "repeated" === r),
              (this.map = !1),
              (this.message = null),
              (this.partOf = null),
              (this.typeDefault = null),
              (this.defaultValue = null),
              (this.long = !!f.Long && h.long[n] !== g),
              (this.bytes = "bytes" === n),
              (this.resolvedType = null),
              (this.extensionField = null),
              (this.declaringField = null),
              (this.n = null),
              (this.comment = u));
          }
          ((u.fromJSON = function (t, i) {
            return new u(
              t,
              i.id,
              i.type,
              i.rule,
              i.extend,
              i.options,
              i.comment,
            );
          }),
            Object.defineProperty(u.prototype, "packed", {
              get: function () {
                return (
                  null === this.n && (this.n = !1 !== this.getOption("packed")),
                  this.n
                );
              },
            }),
            (u.prototype.setOption = function (t, i, n) {
              return (
                "packed" === t && (this.n = null),
                o.prototype.setOption.call(this, t, i, n)
              );
            }),
            (u.prototype.toJSON = function (t) {
              t = !!t && !!t.keepComments;
              return f.toObject([
                "rule",
                ("optional" !== this.rule && this.rule) || g,
                "type",
                this.type,
                "id",
                this.id,
                "extend",
                this.extend,
                "options",
                this.options,
                "comment",
                t ? this.comment : g,
              ]);
            }),
            (u.prototype.resolve = function () {
              var t;
              return this.resolved
                ? this
                : ((this.typeDefault = h.defaults[this.type]) === g
                    ? ((this.resolvedType = (
                        this.declaringField || this
                      ).parent.lookupTypeOrEnum(this.type)),
                      this.resolvedType instanceof r
                        ? (this.typeDefault = null)
                        : (this.typeDefault =
                            this.resolvedType.values[
                              Object.keys(this.resolvedType.values)[0]
                            ]))
                    : this.options &&
                      this.options.proto3_optional &&
                      (this.typeDefault = null),
                  this.options &&
                    null != this.options.default &&
                    ((this.typeDefault = this.options.default),
                    this.resolvedType instanceof e &&
                      "string" == typeof this.typeDefault &&
                      (this.typeDefault =
                        this.resolvedType.values[this.typeDefault])),
                  this.options &&
                    ((!0 !== this.options.packed &&
                      (this.options.packed === g ||
                        !this.resolvedType ||
                        this.resolvedType instanceof e)) ||
                      delete this.options.packed,
                    Object.keys(this.options).length || (this.options = g)),
                  this.long
                    ? ((this.typeDefault = f.Long.fromNumber(
                        this.typeDefault,
                        "u" == (this.type[0] || ""),
                      )),
                      Object.freeze && Object.freeze(this.typeDefault))
                    : this.bytes &&
                      "string" == typeof this.typeDefault &&
                      (f.base64.test(this.typeDefault)
                        ? f.base64.decode(
                            this.typeDefault,
                            (t = f.newBuffer(
                              f.base64.length(this.typeDefault),
                            )),
                            0,
                          )
                        : f.utf8.write(
                            this.typeDefault,
                            (t = f.newBuffer(f.utf8.length(this.typeDefault))),
                            0,
                          ),
                      (this.typeDefault = t)),
                  this.map
                    ? (this.defaultValue = f.emptyObject)
                    : this.repeated
                      ? (this.defaultValue = f.emptyArray)
                      : (this.defaultValue = this.typeDefault),
                  this.parent instanceof r &&
                    (this.parent.ctor.prototype[this.name] = this.defaultValue),
                  o.prototype.resolve.call(this));
            }),
            (u.d = function (n, r, e, s) {
              return (
                "function" == typeof r
                  ? (r = f.decorateType(r).name)
                  : r && "object" == typeof r && (r = f.decorateEnum(r).name),
                function (t, i) {
                  f.decorateType(t.constructor).add(
                    new u(i, n, r, e, { default: s }),
                  );
                }
              );
            }),
            (u.r = function (t) {
              r = t;
            }));
        },
        { 14: 14, 22: 22, 32: 32, 33: 33 },
      ],
      16: [
        function (t, i, n) {
          var r = (i.exports = t(17));
          ((r.build = "light"),
            (r.load = function (t, i, n) {
              return (i =
                "function" == typeof i
                  ? ((n = i), new r.Root())
                  : i || new r.Root()).load(t, n);
            }),
            (r.loadSync = function (t, i) {
              return (i = i || new r.Root()).loadSync(t);
            }),
            (r.encoder = t(13)),
            (r.decoder = t(12)),
            (r.verifier = t(36)),
            (r.converter = t(11)),
            (r.ReflectionObject = t(22)),
            (r.Namespace = t(21)),
            (r.Root = t(26)),
            (r.Enum = t(14)),
            (r.Type = t(31)),
            (r.Field = t(15)),
            (r.OneOf = t(23)),
            (r.MapField = t(18)),
            (r.Service = t(30)),
            (r.Method = t(20)),
            (r.Message = t(19)),
            (r.wrappers = t(37)),
            (r.types = t(32)),
            (r.util = t(33)),
            r.ReflectionObject.r(r.Root),
            r.Namespace.r(r.Type, r.Service, r.Enum),
            r.Root.r(r.Type),
            r.Field.r(r.Type));
        },
        {
          11: 11,
          12: 12,
          13: 13,
          14: 14,
          15: 15,
          17: 17,
          18: 18,
          19: 19,
          20: 20,
          21: 21,
          22: 22,
          23: 23,
          26: 26,
          30: 30,
          31: 31,
          32: 32,
          33: 33,
          36: 36,
          37: 37,
        },
      ],
      17: [
        function (t, i, n) {
          var r = n;
          function e() {
            (r.util.r(),
              r.Writer.r(r.BufferWriter),
              r.Reader.r(r.BufferReader));
          }
          ((r.build = "minimal"),
            (r.Writer = t(38)),
            (r.BufferWriter = t(39)),
            (r.Reader = t(24)),
            (r.BufferReader = t(25)),
            (r.util = t(35)),
            (r.rpc = t(28)),
            (r.roots = t(27)),
            (r.configure = e),
            e());
        },
        { 24: 24, 25: 25, 27: 27, 28: 28, 35: 35, 38: 38, 39: 39 },
      ],
      18: [
        function (t, i, n) {
          i.exports = s;
          var u = t(15),
            r =
              ((((s.prototype = Object.create(u.prototype)).constructor =
                s).className = "MapField"),
              t(32)),
            o = t(33);
          function s(t, i, n, r, e, s) {
            if ((u.call(this, t, i, r, g, g, e, s), !o.isString(n)))
              throw TypeError("keyType must be a string");
            ((this.keyType = n),
              (this.resolvedKeyType = null),
              (this.map = !0));
          }
          ((s.fromJSON = function (t, i) {
            return new s(t, i.id, i.keyType, i.type, i.options, i.comment);
          }),
            (s.prototype.toJSON = function (t) {
              t = !!t && !!t.keepComments;
              return o.toObject([
                "keyType",
                this.keyType,
                "type",
                this.type,
                "id",
                this.id,
                "extend",
                this.extend,
                "options",
                this.options,
                "comment",
                t ? this.comment : g,
              ]);
            }),
            (s.prototype.resolve = function () {
              if (this.resolved) return this;
              if (r.mapKey[this.keyType] === g)
                throw Error("invalid key type: " + this.keyType);
              return u.prototype.resolve.call(this);
            }),
            (s.d = function (n, r, e) {
              return (
                "function" == typeof e
                  ? (e = o.decorateType(e).name)
                  : e && "object" == typeof e && (e = o.decorateEnum(e).name),
                function (t, i) {
                  o.decorateType(t.constructor).add(new s(i, n, r, e));
                }
              );
            }));
        },
        { 15: 15, 32: 32, 33: 33 },
      ],
      19: [
        function (t, i, n) {
          i.exports = e;
          var r = t(35);
          function e(t) {
            if (t)
              for (var i = Object.keys(t), n = 0; n < i.length; ++n)
                this[i[n]] = t[i[n]];
          }
          ((e.create = function (t) {
            return this.$type.create(t);
          }),
            (e.encode = function (t, i) {
              return this.$type.encode(t, i);
            }),
            (e.encodeDelimited = function (t, i) {
              return this.$type.encodeDelimited(t, i);
            }),
            (e.decode = function (t) {
              return this.$type.decode(t);
            }),
            (e.decodeDelimited = function (t) {
              return this.$type.decodeDelimited(t);
            }),
            (e.verify = function (t) {
              return this.$type.verify(t);
            }),
            (e.fromObject = function (t) {
              return this.$type.fromObject(t);
            }),
            (e.toObject = function (t, i) {
              return this.$type.toObject(t, i);
            }),
            (e.prototype.toJSON = function () {
              return this.$type.toObject(this, r.toJSONOptions);
            }));
        },
        { 35: 35 },
      ],
      20: [
        function (t, i, n) {
          i.exports = r;
          var f = t(22),
            c =
              ((((r.prototype = Object.create(f.prototype)).constructor =
                r).className = "Method"),
              t(33));
          function r(t, i, n, r, e, s, u, o, h) {
            if (
              (c.isObject(e)
                ? ((u = e), (e = s = g))
                : c.isObject(s) && ((u = s), (s = g)),
              i !== g && !c.isString(i))
            )
              throw TypeError("type must be a string");
            if (!c.isString(n)) throw TypeError("requestType must be a string");
            if (!c.isString(r))
              throw TypeError("responseType must be a string");
            (f.call(this, t, u),
              (this.type = i || "rpc"),
              (this.requestType = n),
              (this.requestStream = !!e || g),
              (this.responseType = r),
              (this.responseStream = !!s || g),
              (this.resolvedRequestType = null),
              (this.resolvedResponseType = null),
              (this.comment = o),
              (this.parsedOptions = h));
          }
          ((r.fromJSON = function (t, i) {
            return new r(
              t,
              i.type,
              i.requestType,
              i.responseType,
              i.requestStream,
              i.responseStream,
              i.options,
              i.comment,
              i.parsedOptions,
            );
          }),
            (r.prototype.toJSON = function (t) {
              t = !!t && !!t.keepComments;
              return c.toObject([
                "type",
                ("rpc" !== this.type && this.type) || g,
                "requestType",
                this.requestType,
                "requestStream",
                this.requestStream,
                "responseType",
                this.responseType,
                "responseStream",
                this.responseStream,
                "options",
                this.options,
                "comment",
                t ? this.comment : g,
                "parsedOptions",
                this.parsedOptions,
              ]);
            }),
            (r.prototype.resolve = function () {
              return this.resolved
                ? this
                : ((this.resolvedRequestType = this.parent.lookupType(
                    this.requestType,
                  )),
                  (this.resolvedResponseType = this.parent.lookupType(
                    this.responseType,
                  )),
                  f.prototype.resolve.call(this));
            }));
        },
        { 22: 22, 33: 33 },
      ],
      21: [
        function (t, i, n) {
          i.exports = a;
          var e,
            s,
            u,
            r = t(22),
            o =
              ((((a.prototype = Object.create(r.prototype)).constructor =
                a).className = "Namespace"),
              t(15)),
            h = t(33),
            f = t(23);
          function c(t, i) {
            if (!t || !t.length) return g;
            for (var n = {}, r = 0; r < t.length; ++r)
              n[t[r].name] = t[r].toJSON(i);
            return n;
          }
          function a(t, i) {
            (r.call(this, t, i), (this.nested = g), (this.e = null));
          }
          function l(t) {
            return ((t.e = null), t);
          }
          ((a.fromJSON = function (t, i) {
            return new a(t, i.options).addJSON(i.nested);
          }),
            (a.arrayToJSON = c),
            (a.isReservedId = function (t, i) {
              if (t)
                for (var n = 0; n < t.length; ++n)
                  if ("string" != typeof t[n] && t[n][0] <= i && t[n][1] > i)
                    return !0;
              return !1;
            }),
            (a.isReservedName = function (t, i) {
              if (t)
                for (var n = 0; n < t.length; ++n) if (t[n] === i) return !0;
              return !1;
            }),
            Object.defineProperty(a.prototype, "nestedArray", {
              get: function () {
                return this.e || (this.e = h.toArray(this.nested));
              },
            }),
            (a.prototype.toJSON = function (t) {
              return h.toObject([
                "options",
                this.options,
                "nested",
                c(this.nestedArray, t),
              ]);
            }),
            (a.prototype.addJSON = function (t) {
              if (t)
                for (var i, n = Object.keys(t), r = 0; r < n.length; ++r)
                  ((i = t[n[r]]),
                    this.add(
                      (i.fields !== g
                        ? e
                        : i.values !== g
                          ? u
                          : i.methods !== g
                            ? s
                            : i.id !== g
                              ? o
                              : a
                      ).fromJSON(n[r], i),
                    ));
              return this;
            }),
            (a.prototype.get = function (t) {
              return (this.nested && this.nested[t]) || null;
            }),
            (a.prototype.getEnum = function (t) {
              if (this.nested && this.nested[t] instanceof u)
                return this.nested[t].values;
              throw Error("no such enum: " + t);
            }),
            (a.prototype.add = function (t) {
              if (
                !(
                  (t instanceof o && t.extend !== g) ||
                  t instanceof e ||
                  t instanceof f ||
                  t instanceof u ||
                  t instanceof s ||
                  t instanceof a
                )
              )
                throw TypeError("object must be a valid nested object");
              if (this.nested) {
                var i = this.get(t.name);
                if (i) {
                  if (
                    !(i instanceof a && t instanceof a) ||
                    i instanceof e ||
                    i instanceof s
                  )
                    throw Error("duplicate name '" + t.name + "' in " + this);
                  for (var n = i.nestedArray, r = 0; r < n.length; ++r)
                    t.add(n[r]);
                  (this.remove(i),
                    this.nested || (this.nested = {}),
                    t.setOptions(i.options, !0));
                }
              } else this.nested = {};
              return ((this.nested[t.name] = t).onAdd(this), l(this));
            }),
            (a.prototype.remove = function (t) {
              if (!(t instanceof r))
                throw TypeError("object must be a ReflectionObject");
              if (t.parent !== this)
                throw Error(t + " is not a member of " + this);
              return (
                delete this.nested[t.name],
                Object.keys(this.nested).length || (this.nested = g),
                t.onRemove(this),
                l(this)
              );
            }),
            (a.prototype.define = function (t, i) {
              if (h.isString(t)) t = t.split(".");
              else if (!Array.isArray(t)) throw TypeError("illegal path");
              if (t && t.length && "" === t[0])
                throw Error("path must be relative");
              for (var n = this; 0 < t.length; ) {
                var r = t.shift();
                if (n.nested && n.nested[r]) {
                  if (!((n = n.nested[r]) instanceof a))
                    throw Error("path conflicts with non-namespace objects");
                } else n.add((n = new a(r)));
              }
              return (i && n.addJSON(i), n);
            }),
            (a.prototype.resolveAll = function () {
              for (var t = this.nestedArray, i = 0; i < t.length; )
                t[i] instanceof a ? t[i++].resolveAll() : t[i++].resolve();
              return this.resolve();
            }),
            (a.prototype.lookup = function (t, i, n) {
              if (
                ("boolean" == typeof i
                  ? ((n = i), (i = g))
                  : i && !Array.isArray(i) && (i = [i]),
                h.isString(t) && t.length)
              ) {
                if ("." === t) return this.root;
                t = t.split(".");
              } else if (!t.length) return this;
              if ("" === t[0]) return this.root.lookup(t.slice(1), i);
              var r = this.get(t[0]);
              if (r) {
                if (1 === t.length) {
                  if (!i || ~i.indexOf(r.constructor)) return r;
                } else if (r instanceof a && (r = r.lookup(t.slice(1), i, !0)))
                  return r;
              } else
                for (var e = 0; e < this.nestedArray.length; ++e)
                  if (
                    this.e[e] instanceof a &&
                    (r = this.e[e].lookup(t, i, !0))
                  )
                    return r;
              return null === this.parent || n
                ? null
                : this.parent.lookup(t, i);
            }),
            (a.prototype.lookupType = function (t) {
              var i = this.lookup(t, [e]);
              if (i) return i;
              throw Error("no such type: " + t);
            }),
            (a.prototype.lookupEnum = function (t) {
              var i = this.lookup(t, [u]);
              if (i) return i;
              throw Error("no such Enum '" + t + "' in " + this);
            }),
            (a.prototype.lookupTypeOrEnum = function (t) {
              var i = this.lookup(t, [e, u]);
              if (i) return i;
              throw Error("no such Type or Enum '" + t + "' in " + this);
            }),
            (a.prototype.lookupService = function (t) {
              var i = this.lookup(t, [s]);
              if (i) return i;
              throw Error("no such Service '" + t + "' in " + this);
            }),
            (a.r = function (t, i, n) {
              ((e = t), (s = i), (u = n));
            }));
        },
        { 15: 15, 22: 22, 23: 23, 33: 33 },
      ],
      22: [
        function (t, i, n) {
          (i.exports = e).className = "ReflectionObject";
          var r,
            u = t(33);
          function e(t, i) {
            if (!u.isString(t)) throw TypeError("name must be a string");
            if (i && !u.isObject(i))
              throw TypeError("options must be an object");
            ((this.options = i),
              (this.parsedOptions = null),
              (this.name = t),
              (this.parent = null),
              (this.resolved = !1),
              (this.comment = null),
              (this.filename = null));
          }
          (Object.defineProperties(e.prototype, {
            root: {
              get: function () {
                for (var t = this; null !== t.parent; ) t = t.parent;
                return t;
              },
            },
            fullName: {
              get: function () {
                for (var t = [this.name], i = this.parent; i; )
                  (t.unshift(i.name), (i = i.parent));
                return t.join(".");
              },
            },
          }),
            (e.prototype.toJSON = function () {
              throw Error();
            }),
            (e.prototype.onAdd = function (t) {
              (this.parent && this.parent !== t && this.parent.remove(this),
                (this.parent = t),
                (this.resolved = !1));
              t = t.root;
              t instanceof r && t.u(this);
            }),
            (e.prototype.onRemove = function (t) {
              t = t.root;
              (t instanceof r && t.o(this),
                (this.parent = null),
                (this.resolved = !1));
            }),
            (e.prototype.resolve = function () {
              return (
                this.resolved ||
                  (this.root instanceof r && (this.resolved = !0)),
                this
              );
            }),
            (e.prototype.getOption = function (t) {
              return this.options ? this.options[t] : g;
            }),
            (e.prototype.setOption = function (t, i, n) {
              return (
                (n && this.options && this.options[t] !== g) ||
                  ((this.options || (this.options = {}))[t] = i),
                this
              );
            }),
            (e.prototype.setParsedOption = function (i, t, n) {
              this.parsedOptions || (this.parsedOptions = []);
              var r,
                e,
                s = this.parsedOptions;
              return (
                n
                  ? (r = s.find(function (t) {
                      return Object.prototype.hasOwnProperty.call(t, i);
                    }))
                    ? ((e = r[i]), u.setProperty(e, n, t))
                    : (((r = {})[i] = u.setProperty({}, n, t)), s.push(r))
                  : (((e = {})[i] = t), s.push(e)),
                this
              );
            }),
            (e.prototype.setOptions = function (t, i) {
              if (t)
                for (var n = Object.keys(t), r = 0; r < n.length; ++r)
                  this.setOption(n[r], t[n[r]], i);
              return this;
            }),
            (e.prototype.toString = function () {
              var t = this.constructor.className,
                i = this.fullName;
              return i.length ? t + " " + i : t;
            }),
            (e.r = function (t) {
              r = t;
            }));
        },
        { 33: 33 },
      ],
      23: [
        function (t, i, n) {
          i.exports = u;
          var e = t(22),
            r =
              ((((u.prototype = Object.create(e.prototype)).constructor =
                u).className = "OneOf"),
              t(15)),
            s = t(33);
          function u(t, i, n, r) {
            if (
              (Array.isArray(i) || ((n = i), (i = g)),
              e.call(this, t, n),
              i !== g && !Array.isArray(i))
            )
              throw TypeError("fieldNames must be an Array");
            ((this.oneof = i || []),
              (this.fieldsArray = []),
              (this.comment = r));
          }
          function o(t) {
            if (t.parent)
              for (var i = 0; i < t.fieldsArray.length; ++i)
                t.fieldsArray[i].parent || t.parent.add(t.fieldsArray[i]);
          }
          ((u.fromJSON = function (t, i) {
            return new u(t, i.oneof, i.options, i.comment);
          }),
            (u.prototype.toJSON = function (t) {
              t = !!t && !!t.keepComments;
              return s.toObject([
                "options",
                this.options,
                "oneof",
                this.oneof,
                "comment",
                t ? this.comment : g,
              ]);
            }),
            (u.prototype.add = function (t) {
              if (t instanceof r)
                return (
                  t.parent && t.parent !== this.parent && t.parent.remove(t),
                  this.oneof.push(t.name),
                  this.fieldsArray.push(t),
                  o((t.partOf = this)),
                  this
                );
              throw TypeError("field must be a Field");
            }),
            (u.prototype.remove = function (t) {
              if (!(t instanceof r)) throw TypeError("field must be a Field");
              var i = this.fieldsArray.indexOf(t);
              if (i < 0) throw Error(t + " is not a member of " + this);
              return (
                this.fieldsArray.splice(i, 1),
                -1 < (i = this.oneof.indexOf(t.name)) &&
                  this.oneof.splice(i, 1),
                (t.partOf = null),
                this
              );
            }),
            (u.prototype.onAdd = function (t) {
              e.prototype.onAdd.call(this, t);
              for (var i = 0; i < this.oneof.length; ++i) {
                var n = t.get(this.oneof[i]);
                n && !n.partOf && (n.partOf = this).fieldsArray.push(n);
              }
              o(this);
            }),
            (u.prototype.onRemove = function (t) {
              for (var i, n = 0; n < this.fieldsArray.length; ++n)
                (i = this.fieldsArray[n]).parent && i.parent.remove(i);
              e.prototype.onRemove.call(this, t);
            }),
            (u.d = function () {
              for (
                var n = Array(arguments.length), t = 0;
                t < arguments.length;

              )
                n[t] = arguments[t++];
              return function (t, i) {
                (s.decorateType(t.constructor).add(new u(i, n)),
                  Object.defineProperty(t, i, {
                    get: s.oneOfGetter(n),
                    set: s.oneOfSetter(n),
                  }));
              };
            }));
        },
        { 15: 15, 22: 22, 33: 33 },
      ],
      24: [
        function (t, i, n) {
          i.exports = h;
          var r,
            e = t(35),
            s = e.LongBits,
            u = e.utf8;
          function o(t, i) {
            return RangeError(
              "index out of range: " + t.pos + " + " + (i || 1) + " > " + t.len,
            );
          }
          function h(t) {
            ((this.buf = t), (this.pos = 0), (this.len = t.length));
          }
          function f() {
            return e.Buffer
              ? function (t) {
                  return (h.create = function (t) {
                    return e.Buffer.isBuffer(t) ? new r(t) : a(t);
                  })(t);
                }
              : a;
          }
          var c,
            a =
              "undefined" != typeof Uint8Array
                ? function (t) {
                    if (t instanceof Uint8Array || Array.isArray(t))
                      return new h(t);
                    throw Error("illegal buffer");
                  }
                : function (t) {
                    if (Array.isArray(t)) return new h(t);
                    throw Error("illegal buffer");
                  };
          function l() {
            var t = new s(0, 0),
              i = 0;
            if (!(4 < this.len - this.pos)) {
              for (; i < 3; ++i) {
                if (this.pos >= this.len) throw o(this);
                if (
                  ((t.lo =
                    (t.lo | ((127 & this.buf[this.pos]) << (7 * i))) >>> 0),
                  this.buf[this.pos++] < 128)
                )
                  return t;
              }
              return (
                (t.lo =
                  (t.lo | ((127 & this.buf[this.pos++]) << (7 * i))) >>> 0),
                t
              );
            }
            for (; i < 4; ++i)
              if (
                ((t.lo =
                  (t.lo | ((127 & this.buf[this.pos]) << (7 * i))) >>> 0),
                this.buf[this.pos++] < 128)
              )
                return t;
            if (
              ((t.lo = (t.lo | ((127 & this.buf[this.pos]) << 28)) >>> 0),
              (t.hi = (t.hi | ((127 & this.buf[this.pos]) >> 4)) >>> 0),
              this.buf[this.pos++] < 128)
            )
              return t;
            if (((i = 0), 4 < this.len - this.pos)) {
              for (; i < 5; ++i)
                if (
                  ((t.hi =
                    (t.hi | ((127 & this.buf[this.pos]) << (7 * i + 3))) >>> 0),
                  this.buf[this.pos++] < 128)
                )
                  return t;
            } else
              for (; i < 5; ++i) {
                if (this.pos >= this.len) throw o(this);
                if (
                  ((t.hi =
                    (t.hi | ((127 & this.buf[this.pos]) << (7 * i + 3))) >>> 0),
                  this.buf[this.pos++] < 128)
                )
                  return t;
              }
            throw Error("invalid varint encoding");
          }
          function d(t, i) {
            return (
              (t[i - 4] |
                (t[i - 3] << 8) |
                (t[i - 2] << 16) |
                (t[i - 1] << 24)) >>>
              0
            );
          }
          function v() {
            if (this.pos + 8 > this.len) throw o(this, 8);
            return new s(
              d(this.buf, (this.pos += 4)),
              d(this.buf, (this.pos += 4)),
            );
          }
          ((h.create = f()),
            (h.prototype.h =
              e.Array.prototype.subarray || e.Array.prototype.slice),
            (h.prototype.uint32 =
              ((c = 4294967295),
              function () {
                if (
                  ((c = (127 & this.buf[this.pos]) >>> 0),
                  this.buf[this.pos++] < 128 ||
                    ((c = (c | ((127 & this.buf[this.pos]) << 7)) >>> 0),
                    this.buf[this.pos++] < 128 ||
                      ((c = (c | ((127 & this.buf[this.pos]) << 14)) >>> 0),
                      this.buf[this.pos++] < 128 ||
                        ((c = (c | ((127 & this.buf[this.pos]) << 21)) >>> 0),
                        this.buf[this.pos++] < 128 ||
                          ((c = (c | ((15 & this.buf[this.pos]) << 28)) >>> 0),
                          this.buf[this.pos++] < 128 ||
                            !((this.pos += 5) > this.len))))))
                )
                  return c;
                throw ((this.pos = this.len), o(this, 10));
              })),
            (h.prototype.int32 = function () {
              return 0 | this.uint32();
            }),
            (h.prototype.sint32 = function () {
              var t = this.uint32();
              return ((t >>> 1) ^ -(1 & t)) | 0;
            }),
            (h.prototype.bool = function () {
              return 0 !== this.uint32();
            }),
            (h.prototype.fixed32 = function () {
              if (this.pos + 4 > this.len) throw o(this, 4);
              return d(this.buf, (this.pos += 4));
            }),
            (h.prototype.sfixed32 = function () {
              if (this.pos + 4 > this.len) throw o(this, 4);
              return 0 | d(this.buf, (this.pos += 4));
            }),
            (h.prototype.float = function () {
              if (this.pos + 4 > this.len) throw o(this, 4);
              var t = e.float.readFloatLE(this.buf, this.pos);
              return ((this.pos += 4), t);
            }),
            (h.prototype.double = function () {
              if (this.pos + 8 > this.len) throw o(this, 4);
              var t = e.float.readDoubleLE(this.buf, this.pos);
              return ((this.pos += 8), t);
            }),
            (h.prototype.bytes = function () {
              var t = this.uint32(),
                i = this.pos,
                n = this.pos + t;
              if (n > this.len) throw o(this, t);
              return (
                (this.pos += t),
                Array.isArray(this.buf)
                  ? this.buf.slice(i, n)
                  : i === n
                    ? new this.buf.constructor(0)
                    : this.h.call(this.buf, i, n)
              );
            }),
            (h.prototype.string = function () {
              var t = this.bytes();
              return u.read(t, 0, t.length);
            }),
            (h.prototype.skip = function (t) {
              if ("number" == typeof t) {
                if (this.pos + t > this.len) throw o(this, t);
                this.pos += t;
              } else
                do {
                  if (this.pos >= this.len) throw o(this);
                } while (128 & this.buf[this.pos++]);
              return this;
            }),
            (h.prototype.skipType = function (t) {
              switch (t) {
                case 0:
                  this.skip();
                  break;
                case 1:
                  this.skip(8);
                  break;
                case 2:
                  this.skip(this.uint32());
                  break;
                case 3:
                  for (; 4 != (t = 7 & this.uint32()); ) this.skipType(t);
                  break;
                case 5:
                  this.skip(4);
                  break;
                default:
                  throw Error(
                    "invalid wire type " + t + " at offset " + this.pos,
                  );
              }
              return this;
            }),
            (h.r = function (t) {
              ((r = t), (h.create = f()), r.r());
              var i = e.Long ? "toLong" : "toNumber";
              e.merge(h.prototype, {
                int64: function () {
                  return l.call(this)[i](!1);
                },
                uint64: function () {
                  return l.call(this)[i](!0);
                },
                sint64: function () {
                  return l.call(this).zzDecode()[i](!1);
                },
                fixed64: function () {
                  return v.call(this)[i](!0);
                },
                sfixed64: function () {
                  return v.call(this)[i](!1);
                },
              });
            }));
        },
        { 35: 35 },
      ],
      25: [
        function (t, i, n) {
          i.exports = s;
          var r = t(24),
            e =
              (((s.prototype = Object.create(r.prototype)).constructor = s),
              t(35));
          function s(t) {
            r.call(this, t);
          }
          ((s.r = function () {
            e.Buffer && (s.prototype.h = e.Buffer.prototype.slice);
          }),
            (s.prototype.string = function () {
              var t = this.uint32();
              return this.buf.utf8Slice
                ? this.buf.utf8Slice(
                    this.pos,
                    (this.pos = Math.min(this.pos + t, this.len)),
                  )
                : this.buf.toString(
                    "utf-8",
                    this.pos,
                    (this.pos = Math.min(this.pos + t, this.len)),
                  );
            }),
            s.r());
        },
        { 24: 24, 35: 35 },
      ],
      26: [
        function (t, i, n) {
          i.exports = h;
          var r,
            d,
            v,
            e = t(21),
            s =
              ((((h.prototype = Object.create(e.prototype)).constructor =
                h).className = "Root"),
              t(15)),
            u = t(14),
            o = t(23),
            b = t(33);
          function h(t) {
            (e.call(this, "", t), (this.deferred = []), (this.files = []));
          }
          function p() {}
          ((h.fromJSON = function (t, i) {
            return (
              (i = i || new h()),
              t.options && i.setOptions(t.options),
              i.addJSON(t.nested)
            );
          }),
            (h.prototype.resolvePath = b.path.resolve),
            (h.prototype.fetch = b.fetch),
            (h.prototype.load = function t(i, s, e) {
              "function" == typeof s && ((e = s), (s = g));
              var u = this;
              if (!e) return b.asPromise(t, u, i, s);
              var o = e === p;
              function h(t, i) {
                if (e) {
                  var n = e;
                  if (((e = null), o)) throw t;
                  n(t, i);
                }
              }
              function f(t) {
                var i = t.lastIndexOf("google/protobuf/");
                if (-1 < i) {
                  t = t.substring(i);
                  if (t in v) return t;
                }
                return null;
              }
              function c(t, i) {
                try {
                  if (
                    (b.isString(i) &&
                      "{" == (i[0] || "") &&
                      (i = JSON.parse(i)),
                    b.isString(i))
                  ) {
                    d.filename = t;
                    var n,
                      r = d(i, u, s),
                      e = 0;
                    if (r.imports)
                      for (; e < r.imports.length; ++e)
                        (n =
                          f(r.imports[e]) || u.resolvePath(t, r.imports[e])) &&
                          a(n);
                    if (r.weakImports)
                      for (e = 0; e < r.weakImports.length; ++e)
                        (n =
                          f(r.weakImports[e]) ||
                          u.resolvePath(t, r.weakImports[e])) && a(n, !0);
                  } else u.setOptions(i.options).addJSON(i.nested);
                } catch (t) {
                  h(t);
                }
                o || l || h(null, u);
              }
              function a(n, r) {
                if (!~u.files.indexOf(n))
                  if ((u.files.push(n), n in v))
                    o
                      ? c(n, v[n])
                      : (++l,
                        setTimeout(function () {
                          (--l, c(n, v[n]));
                        }));
                  else if (o) {
                    var t;
                    try {
                      t = b.fs.readFileSync(n).toString("utf8");
                    } catch (t) {
                      return void (r || h(t));
                    }
                    c(n, t);
                  } else
                    (++l,
                      u.fetch(n, function (t, i) {
                        (--l,
                          e && (t ? (r ? l || h(null, u) : h(t)) : c(n, i)));
                      }));
              }
              var l = 0;
              b.isString(i) && (i = [i]);
              for (var n, r = 0; r < i.length; ++r)
                (n = u.resolvePath("", i[r])) && a(n);
              return o ? u : (l || h(null, u), g);
            }),
            (h.prototype.loadSync = function (t, i) {
              if (b.isNode) return this.load(t, i, p);
              throw Error("not supported");
            }),
            (h.prototype.resolveAll = function () {
              if (this.deferred.length)
                throw Error(
                  "unresolvable extensions: " +
                    this.deferred
                      .map(function (t) {
                        return (
                          "'extend " + t.extend + "' in " + t.parent.fullName
                        );
                      })
                      .join(", "),
                );
              return e.prototype.resolveAll.call(this);
            }));
          var f = /^[A-Z]/;
          function c(t, i) {
            var n,
              r = i.parent.lookup(i.extend);
            if (r)
              return (
                (((n = new s(
                  i.fullName,
                  i.id,
                  i.type,
                  i.rule,
                  g,
                  i.options,
                )).declaringField = i).extensionField = n),
                r.add(n),
                1
              );
          }
          ((h.prototype.u = function (t) {
            if (t instanceof s)
              t.extend === g ||
                t.extensionField ||
                c(0, t) ||
                this.deferred.push(t);
            else if (t instanceof u)
              f.test(t.name) && (t.parent[t.name] = t.values);
            else if (!(t instanceof o)) {
              if (t instanceof r)
                for (var i = 0; i < this.deferred.length; )
                  c(0, this.deferred[i]) ? this.deferred.splice(i, 1) : ++i;
              for (var n = 0; n < t.nestedArray.length; ++n) this.u(t.e[n]);
              f.test(t.name) && (t.parent[t.name] = t);
            }
          }),
            (h.prototype.o = function (t) {
              var i;
              if (t instanceof s)
                t.extend !== g &&
                  (t.extensionField
                    ? (t.extensionField.parent.remove(t.extensionField),
                      (t.extensionField = null))
                    : -1 < (i = this.deferred.indexOf(t)) &&
                      this.deferred.splice(i, 1));
              else if (t instanceof u)
                f.test(t.name) && delete t.parent[t.name];
              else if (t instanceof e) {
                for (var n = 0; n < t.nestedArray.length; ++n) this.o(t.e[n]);
                f.test(t.name) && delete t.parent[t.name];
              }
            }),
            (h.r = function (t, i, n) {
              ((r = t), (d = i), (v = n));
            }));
        },
        { 14: 14, 15: 15, 21: 21, 23: 23, 33: 33 },
      ],
      27: [
        function (t, i, n) {
          i.exports = {};
        },
        {},
      ],
      28: [
        function (t, i, n) {
          n.Service = t(29);
        },
        { 29: 29 },
      ],
      29: [
        function (t, i, n) {
          i.exports = r;
          var o = t(35);
          function r(t, i, n) {
            if ("function" != typeof t)
              throw TypeError("rpcImpl must be a function");
            (o.EventEmitter.call(this),
              (this.rpcImpl = t),
              (this.requestDelimited = !!i),
              (this.responseDelimited = !!n));
          }
          ((((r.prototype = Object.create(
            o.EventEmitter.prototype,
          )).constructor = r).prototype.rpcCall = function t(n, i, r, e, s) {
            if (!e) throw TypeError("request must be specified");
            var u = this;
            if (!s) return o.asPromise(t, u, n, i, r, e);
            if (!u.rpcImpl)
              return (
                setTimeout(function () {
                  s(Error("already ended"));
                }, 0),
                g
              );
            try {
              return u.rpcImpl(
                n,
                i[u.requestDelimited ? "encodeDelimited" : "encode"](
                  e,
                ).finish(),
                function (t, i) {
                  if (t) return (u.emit("error", t, n), s(t));
                  if (null === i) return (u.end(!0), g);
                  if (!(i instanceof r))
                    try {
                      i =
                        r[u.responseDelimited ? "decodeDelimited" : "decode"](
                          i,
                        );
                    } catch (t) {
                      return (u.emit("error", t, n), s(t));
                    }
                  return (u.emit("data", i, n), s(null, i));
                },
              );
            } catch (t) {
              return (
                u.emit("error", t, n),
                setTimeout(function () {
                  s(t);
                }, 0),
                g
              );
            }
          }),
            (r.prototype.end = function (t) {
              return (
                this.rpcImpl &&
                  (t || this.rpcImpl(null, null, null),
                  (this.rpcImpl = null),
                  this.emit("end").off()),
                this
              );
            }));
        },
        { 35: 35 },
      ],
      30: [
        function (t, i, n) {
          i.exports = u;
          var r = t(21),
            s =
              ((((u.prototype = Object.create(r.prototype)).constructor =
                u).className = "Service"),
              t(20)),
            o = t(33),
            h = t(28);
          function u(t, i) {
            (r.call(this, t, i), (this.methods = {}), (this.f = null));
          }
          function e(t) {
            return ((t.f = null), t);
          }
          ((u.fromJSON = function (t, i) {
            var n = new u(t, i.options);
            if (i.methods)
              for (var r = Object.keys(i.methods), e = 0; e < r.length; ++e)
                n.add(s.fromJSON(r[e], i.methods[r[e]]));
            return (
              i.nested && n.addJSON(i.nested),
              (n.comment = i.comment),
              n
            );
          }),
            (u.prototype.toJSON = function (t) {
              var i = r.prototype.toJSON.call(this, t),
                n = !!t && !!t.keepComments;
              return o.toObject([
                "options",
                (i && i.options) || g,
                "methods",
                r.arrayToJSON(this.methodsArray, t) || {},
                "nested",
                (i && i.nested) || g,
                "comment",
                n ? this.comment : g,
              ]);
            }),
            Object.defineProperty(u.prototype, "methodsArray", {
              get: function () {
                return this.f || (this.f = o.toArray(this.methods));
              },
            }),
            (u.prototype.get = function (t) {
              return this.methods[t] || r.prototype.get.call(this, t);
            }),
            (u.prototype.resolveAll = function () {
              for (var t = this.methodsArray, i = 0; i < t.length; ++i)
                t[i].resolve();
              return r.prototype.resolve.call(this);
            }),
            (u.prototype.add = function (t) {
              if (this.get(t.name))
                throw Error("duplicate name '" + t.name + "' in " + this);
              return t instanceof s
                ? e(((this.methods[t.name] = t).parent = this))
                : r.prototype.add.call(this, t);
            }),
            (u.prototype.remove = function (t) {
              if (t instanceof s) {
                if (this.methods[t.name] !== t)
                  throw Error(t + " is not a member of " + this);
                return (
                  delete this.methods[t.name],
                  (t.parent = null),
                  e(this)
                );
              }
              return r.prototype.remove.call(this, t);
            }),
            (u.prototype.create = function (t, i, n) {
              for (
                var r, e = new h.Service(t, i, n), s = 0;
                s < this.methodsArray.length;
                ++s
              ) {
                var u = o
                  .lcFirst((r = this.f[s]).resolve().name)
                  .replace(/[^$\w_]/g, "");
                e[u] = o.codegen(
                  ["r", "c"],
                  o.isReserved(u) ? u + "_" : u,
                )("return this.rpcCall(m,q,s,r,c)")({
                  m: r,
                  q: r.resolvedRequestType.ctor,
                  s: r.resolvedResponseType.ctor,
                });
              }
              return e;
            }));
        },
        { 20: 20, 21: 21, 28: 28, 33: 33 },
      ],
      31: [
        function (t, i, n) {
          i.exports = w;
          var u = t(21),
            o =
              ((((w.prototype = Object.create(u.prototype)).constructor =
                w).className = "Type"),
              t(14)),
            h = t(23),
            f = t(15),
            c = t(18),
            a = t(30),
            e = t(19),
            s = t(24),
            l = t(38),
            d = t(33),
            v = t(13),
            b = t(12),
            p = t(36),
            y = t(11),
            m = t(37);
          function w(t, i) {
            (u.call(this, t, i),
              (this.fields = {}),
              (this.oneofs = g),
              (this.extensions = g),
              (this.reserved = g),
              (this.group = g),
              (this.c = null),
              (this.i = null),
              (this.a = null),
              (this.l = null));
          }
          function r(t) {
            return (
              (t.c = t.i = t.a = null),
              delete t.encode,
              delete t.decode,
              delete t.verify,
              t
            );
          }
          (Object.defineProperties(w.prototype, {
            fieldsById: {
              get: function () {
                if (!this.c) {
                  this.c = {};
                  for (
                    var t = Object.keys(this.fields), i = 0;
                    i < t.length;
                    ++i
                  ) {
                    var n = this.fields[t[i]],
                      r = n.id;
                    if (this.c[r])
                      throw Error("duplicate id " + r + " in " + this);
                    this.c[r] = n;
                  }
                }
                return this.c;
              },
            },
            fieldsArray: {
              get: function () {
                return this.i || (this.i = d.toArray(this.fields));
              },
            },
            oneofsArray: {
              get: function () {
                return this.a || (this.a = d.toArray(this.oneofs));
              },
            },
            ctor: {
              get: function () {
                return this.l || (this.ctor = w.generateConstructor(this)());
              },
              set: function (t) {
                for (
                  var i = t.prototype,
                    n =
                      (i instanceof e ||
                        (((t.prototype = new e()).constructor = t),
                        d.merge(t.prototype, i)),
                      (t.$type = t.prototype.$type = this),
                      d.merge(t, e, !0),
                      (this.l = t),
                      0);
                  n < this.fieldsArray.length;
                  ++n
                )
                  this.i[n].resolve();
                for (var r = {}, n = 0; n < this.oneofsArray.length; ++n)
                  r[this.a[n].resolve().name] = {
                    get: d.oneOfGetter(this.a[n].oneof),
                    set: d.oneOfSetter(this.a[n].oneof),
                  };
                n && Object.defineProperties(t.prototype, r);
              },
            },
          }),
            (w.generateConstructor = function (t) {
              for (
                var i, n = d.codegen(["p"], t.name), r = 0;
                r < t.fieldsArray.length;
                ++r
              )
                (i = t.i[r]).map
                  ? n("this%s={}", d.safeProp(i.name))
                  : i.repeated && n("this%s=[]", d.safeProp(i.name));
              return n(
                "if(p)for(var ks=Object.keys(p),i=0;i<ks.length;++i)if(p[ks[i]]!=null)",
              )("this[ks[i]]=p[ks[i]]");
            }),
            (w.fromJSON = function (t, i) {
              for (
                var n = new w(t, i.options),
                  r =
                    ((n.extensions = i.extensions),
                    (n.reserved = i.reserved),
                    Object.keys(i.fields)),
                  e = 0;
                e < r.length;
                ++e
              )
                n.add(
                  (void 0 !== i.fields[r[e]].keyType ? c : f).fromJSON(
                    r[e],
                    i.fields[r[e]],
                  ),
                );
              if (i.oneofs)
                for (r = Object.keys(i.oneofs), e = 0; e < r.length; ++e)
                  n.add(h.fromJSON(r[e], i.oneofs[r[e]]));
              if (i.nested)
                for (r = Object.keys(i.nested), e = 0; e < r.length; ++e) {
                  var s = i.nested[r[e]];
                  n.add(
                    (s.id !== g
                      ? f
                      : s.fields !== g
                        ? w
                        : s.values !== g
                          ? o
                          : s.methods !== g
                            ? a
                            : u
                    ).fromJSON(r[e], s),
                  );
                }
              return (
                i.extensions &&
                  i.extensions.length &&
                  (n.extensions = i.extensions),
                i.reserved && i.reserved.length && (n.reserved = i.reserved),
                i.group && (n.group = !0),
                i.comment && (n.comment = i.comment),
                n
              );
            }),
            (w.prototype.toJSON = function (t) {
              var i = u.prototype.toJSON.call(this, t),
                n = !!t && !!t.keepComments;
              return d.toObject([
                "options",
                (i && i.options) || g,
                "oneofs",
                u.arrayToJSON(this.oneofsArray, t),
                "fields",
                u.arrayToJSON(
                  this.fieldsArray.filter(function (t) {
                    return !t.declaringField;
                  }),
                  t,
                ) || {},
                "extensions",
                this.extensions && this.extensions.length ? this.extensions : g,
                "reserved",
                this.reserved && this.reserved.length ? this.reserved : g,
                "group",
                this.group || g,
                "nested",
                (i && i.nested) || g,
                "comment",
                n ? this.comment : g,
              ]);
            }),
            (w.prototype.resolveAll = function () {
              for (var t = this.fieldsArray, i = 0; i < t.length; )
                t[i++].resolve();
              for (var n = this.oneofsArray, i = 0; i < n.length; )
                n[i++].resolve();
              return u.prototype.resolveAll.call(this);
            }),
            (w.prototype.get = function (t) {
              return (
                this.fields[t] ||
                (this.oneofs && this.oneofs[t]) ||
                (this.nested && this.nested[t]) ||
                null
              );
            }),
            (w.prototype.add = function (t) {
              if (this.get(t.name))
                throw Error("duplicate name '" + t.name + "' in " + this);
              if (t instanceof f && t.extend === g) {
                if ((this.c || this.fieldsById)[t.id])
                  throw Error("duplicate id " + t.id + " in " + this);
                if (this.isReservedId(t.id))
                  throw Error("id " + t.id + " is reserved in " + this);
                if (this.isReservedName(t.name))
                  throw Error("name '" + t.name + "' is reserved in " + this);
                return (
                  t.parent && t.parent.remove(t),
                  ((this.fields[t.name] = t).message = this),
                  t.onAdd(this),
                  r(this)
                );
              }
              return t instanceof h
                ? (this.oneofs || (this.oneofs = {}),
                  (this.oneofs[t.name] = t).onAdd(this),
                  r(this))
                : u.prototype.add.call(this, t);
            }),
            (w.prototype.remove = function (t) {
              if (t instanceof f && t.extend === g) {
                if (this.fields && this.fields[t.name] === t)
                  return (
                    delete this.fields[t.name],
                    (t.parent = null),
                    t.onRemove(this),
                    r(this)
                  );
                throw Error(t + " is not a member of " + this);
              }
              if (t instanceof h) {
                if (this.oneofs && this.oneofs[t.name] === t)
                  return (
                    delete this.oneofs[t.name],
                    (t.parent = null),
                    t.onRemove(this),
                    r(this)
                  );
                throw Error(t + " is not a member of " + this);
              }
              return u.prototype.remove.call(this, t);
            }),
            (w.prototype.isReservedId = function (t) {
              return u.isReservedId(this.reserved, t);
            }),
            (w.prototype.isReservedName = function (t) {
              return u.isReservedName(this.reserved, t);
            }),
            (w.prototype.create = function (t) {
              return new this.ctor(t);
            }),
            (w.prototype.setup = function () {
              for (
                var t = this.fullName, i = [], n = 0;
                n < this.fieldsArray.length;
                ++n
              )
                i.push(this.i[n].resolve().resolvedType);
              ((this.encode = v(this)({ Writer: l, types: i, util: d })),
                (this.decode = b(this)({ Reader: s, types: i, util: d })),
                (this.verify = p(this)({ types: i, util: d })),
                (this.fromObject = y.fromObject(this)({ types: i, util: d })),
                (this.toObject = y.toObject(this)({ types: i, util: d })));
              var r,
                t = m[t];
              return (
                t &&
                  (((r = Object.create(this)).fromObject = this.fromObject),
                  (this.fromObject = t.fromObject.bind(r)),
                  (r.toObject = this.toObject),
                  (this.toObject = t.toObject.bind(r))),
                this
              );
            }),
            (w.prototype.encode = function (t, i) {
              return this.setup().encode(t, i);
            }),
            (w.prototype.encodeDelimited = function (t, i) {
              return this.encode(t, i && i.len ? i.fork() : i).ldelim();
            }),
            (w.prototype.decode = function (t, i) {
              return this.setup().decode(t, i);
            }),
            (w.prototype.decodeDelimited = function (t) {
              return (
                t instanceof s || (t = s.create(t)),
                this.decode(t, t.uint32())
              );
            }),
            (w.prototype.verify = function (t) {
              return this.setup().verify(t);
            }),
            (w.prototype.fromObject = function (t) {
              return this.setup().fromObject(t);
            }),
            (w.prototype.toObject = function (t, i) {
              return this.setup().toObject(t, i);
            }),
            (w.d = function (i) {
              return function (t) {
                d.decorateType(t, i);
              };
            }));
        },
        {
          11: 11,
          12: 12,
          13: 13,
          14: 14,
          15: 15,
          18: 18,
          19: 19,
          21: 21,
          23: 23,
          24: 24,
          30: 30,
          33: 33,
          36: 36,
          37: 37,
          38: 38,
        },
      ],
      32: [
        function (t, i, n) {
          var t = t(33),
            e = [
              "double",
              "float",
              "int32",
              "uint32",
              "sint32",
              "fixed32",
              "sfixed32",
              "int64",
              "uint64",
              "sint64",
              "fixed64",
              "sfixed64",
              "bool",
              "string",
              "bytes",
            ];
          function r(t, i) {
            var n = 0,
              r = {};
            for (i |= 0; n < t.length; ) r[e[n + i]] = t[n++];
            return r;
          }
          ((n.basic = r([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2, 2])),
            (n.defaults = r([
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              !1,
              "",
              t.emptyArray,
              null,
            ])),
            (n.long = r([0, 0, 0, 1, 1], 7)),
            (n.mapKey = r([0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2], 2)),
            (n.packed = r([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0])));
        },
        { 33: 33 },
      ],
      33: [
        function (n, t, i) {
          var r,
            e,
            s = (t.exports = n(35)),
            u = n(27),
            o =
              ((s.codegen = n(3)),
              (s.fetch = n(5)),
              (s.path = n(8)),
              (s.fs = s.inquire("fs")),
              (s.toArray = function (t) {
                if (t) {
                  for (
                    var i = Object.keys(t), n = Array(i.length), r = 0;
                    r < i.length;

                  )
                    n[r] = t[i[r++]];
                  return n;
                }
                return [];
              }),
              (s.toObject = function (t) {
                for (var i = {}, n = 0; n < t.length; ) {
                  var r = t[n++],
                    e = t[n++];
                  e !== g && (i[r] = e);
                }
                return i;
              }),
              /\\/g),
            h = /"/g,
            f =
              ((s.isReserved = function (t) {
                return /^(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/.test(
                  t,
                );
              }),
              (s.safeProp = function (t) {
                return !/^[$\w_]+$/.test(t) || s.isReserved(t)
                  ? '["' + t.replace(o, "\\\\").replace(h, '\\"') + '"]'
                  : "." + t;
              }),
              (s.ucFirst = function (t) {
                return (t[0] || "").toUpperCase() + t.substring(1);
              }),
              /_([a-z])/g),
            c =
              ((s.camelCase = function (t) {
                return (
                  t.substring(0, 1) +
                  t.substring(1).replace(f, function (t, i) {
                    return i.toUpperCase();
                  })
                );
              }),
              (s.compareFieldsById = function (t, i) {
                return t.id - i.id;
              }),
              (s.decorateType = function (t, i) {
                return t.$type
                  ? (i &&
                      t.$type.name !== i &&
                      (s.decorateRoot.remove(t.$type),
                      (t.$type.name = i),
                      s.decorateRoot.add(t.$type)),
                    t.$type)
                  : ((i = new (r = r || n(31))(i || t.name)),
                    s.decorateRoot.add(i),
                    (i.ctor = t),
                    Object.defineProperty(t, "$type", {
                      value: i,
                      enumerable: !1,
                    }),
                    Object.defineProperty(t.prototype, "$type", {
                      value: i,
                      enumerable: !1,
                    }),
                    i);
              }),
              0);
          ((s.decorateEnum = function (t) {
            var i;
            return (
              t.$type ||
              ((i = new (e = e || n(14))("Enum" + c++, t)),
              s.decorateRoot.add(i),
              Object.defineProperty(t, "$type", { value: i, enumerable: !1 }),
              i)
            );
          }),
            (s.setProperty = function (t, i, n) {
              if ("object" != typeof t)
                throw TypeError("dst must be an object");
              if (i)
                return (function t(i, n, r) {
                  var e = n.shift();
                  return (
                    "__proto__" !== e &&
                      (0 < n.length
                        ? (i[e] = t(i[e] || {}, n, r))
                        : ((n = i[e]) && (r = [].concat(n).concat(r)),
                          (i[e] = r))),
                    i
                  );
                })(t, (i = i.split(".")), n);
              throw TypeError("path must be specified");
            }),
            Object.defineProperty(s, "decorateRoot", {
              get: function () {
                return u.decorated || (u.decorated = new (n(26))());
              },
            }));
        },
        { 14: 14, 26: 26, 27: 27, 3: 3, 31: 31, 35: 35, 5: 5, 8: 8 },
      ],
      34: [
        function (t, i, n) {
          i.exports = e;
          var r = t(35);
          function e(t, i) {
            ((this.lo = t >>> 0), (this.hi = i >>> 0));
          }
          var s = (e.zero = new e(0, 0)),
            u =
              ((s.toNumber = function () {
                return 0;
              }),
              (s.zzEncode = s.zzDecode =
                function () {
                  return this;
                }),
              (s.length = function () {
                return 1;
              }),
              (e.zeroHash = "\0\0\0\0\0\0\0\0"),
              (e.fromNumber = function (t) {
                var i, n;
                return 0 === t
                  ? s
                  : ((n = (t = (i = t < 0) ? -t : t) >>> 0),
                    (t = ((t - n) / 4294967296) >>> 0),
                    i &&
                      ((t = ~t >>> 0),
                      (n = ~n >>> 0),
                      4294967295 < ++n &&
                        ((n = 0), 4294967295 < ++t && (t = 0))),
                    new e(n, t));
              }),
              (e.from = function (t) {
                if ("number" == typeof t) return e.fromNumber(t);
                if (r.isString(t)) {
                  if (!r.Long) return e.fromNumber(parseInt(t, 10));
                  t = r.Long.fromString(t);
                }
                return t.low || t.high ? new e(t.low >>> 0, t.high >>> 0) : s;
              }),
              (e.prototype.toNumber = function (t) {
                var i;
                return !t && this.hi >>> 31
                  ? ((t = (1 + ~this.lo) >>> 0),
                    (i = ~this.hi >>> 0),
                    -(t + 4294967296 * (i = t ? i : (i + 1) >>> 0)))
                  : this.lo + 4294967296 * this.hi;
              }),
              (e.prototype.toLong = function (t) {
                return r.Long
                  ? new r.Long(0 | this.lo, 0 | this.hi, !!t)
                  : { low: 0 | this.lo, high: 0 | this.hi, unsigned: !!t };
              }),
              String.prototype.charCodeAt);
          ((e.fromHash = function (t) {
            return "\0\0\0\0\0\0\0\0" === t
              ? s
              : new e(
                  (u.call(t, 0) |
                    (u.call(t, 1) << 8) |
                    (u.call(t, 2) << 16) |
                    (u.call(t, 3) << 24)) >>>
                    0,
                  (u.call(t, 4) |
                    (u.call(t, 5) << 8) |
                    (u.call(t, 6) << 16) |
                    (u.call(t, 7) << 24)) >>>
                    0,
                );
          }),
            (e.prototype.toHash = function () {
              return String.fromCharCode(
                255 & this.lo,
                (this.lo >>> 8) & 255,
                (this.lo >>> 16) & 255,
                this.lo >>> 24,
                255 & this.hi,
                (this.hi >>> 8) & 255,
                (this.hi >>> 16) & 255,
                this.hi >>> 24,
              );
            }),
            (e.prototype.zzEncode = function () {
              var t = this.hi >> 31;
              return (
                (this.hi = (((this.hi << 1) | (this.lo >>> 31)) ^ t) >>> 0),
                (this.lo = ((this.lo << 1) ^ t) >>> 0),
                this
              );
            }),
            (e.prototype.zzDecode = function () {
              var t = -(1 & this.lo);
              return (
                (this.lo = (((this.lo >>> 1) | (this.hi << 31)) ^ t) >>> 0),
                (this.hi = ((this.hi >>> 1) ^ t) >>> 0),
                this
              );
            }),
            (e.prototype.length = function () {
              var t = this.lo,
                i = ((this.lo >>> 28) | (this.hi << 4)) >>> 0,
                n = this.hi >>> 24;
              return 0 == n
                ? 0 == i
                  ? t < 16384
                    ? t < 128
                      ? 1
                      : 2
                    : t < 2097152
                      ? 3
                      : 4
                  : i < 16384
                    ? i < 128
                      ? 5
                      : 6
                    : i < 2097152
                      ? 7
                      : 8
                : n < 128
                  ? 9
                  : 10;
            }));
        },
        { 35: 35 },
      ],
      35: [
        function (t, i, n) {
          var r = n;
          function e(t, i, n) {
            for (var r = Object.keys(i), e = 0; e < r.length; ++e)
              (t[r[e]] !== g && n) || (t[r[e]] = i[r[e]]);
            return t;
          }
          function s(t) {
            function n(t, i) {
              if (!(this instanceof n)) return new n(t, i);
              (Object.defineProperty(this, "message", {
                get: function () {
                  return t;
                },
              }),
                Error.captureStackTrace
                  ? Error.captureStackTrace(this, n)
                  : Object.defineProperty(this, "stack", {
                      value: Error().stack || "",
                    }),
                i && e(this, i));
            }
            return (
              (n.prototype = Object.create(Error.prototype, {
                constructor: {
                  value: n,
                  writable: !0,
                  enumerable: !1,
                  configurable: !0,
                },
                name: {
                  get() {
                    return t;
                  },
                  set: g,
                  enumerable: !1,
                  configurable: !0,
                },
                toString: {
                  value() {
                    return this.name + ": " + this.message;
                  },
                  writable: !0,
                  enumerable: !1,
                  configurable: !0,
                },
              })),
              n
            );
          }
          ((r.asPromise = t(1)),
            (r.base64 = t(2)),
            (r.EventEmitter = t(4)),
            (r.float = t(6)),
            (r.inquire = t(7)),
            (r.utf8 = t(10)),
            (r.pool = t(9)),
            (r.LongBits = t(34)),
            (r.isNode = !!(
              "undefined" != typeof global &&
              global &&
              global.process &&
              global.process.versions &&
              global.process.versions.node
            )),
            (r.global =
              (r.isNode && global) ||
              ("undefined" != typeof window && window) ||
              ("undefined" != typeof self && self) ||
              this),
            (r.emptyArray = Object.freeze ? Object.freeze([]) : []),
            (r.emptyObject = Object.freeze ? Object.freeze({}) : {}),
            (r.isInteger =
              Number.isInteger ||
              function (t) {
                return (
                  "number" == typeof t && isFinite(t) && Math.floor(t) === t
                );
              }),
            (r.isString = function (t) {
              return "string" == typeof t || t instanceof String;
            }),
            (r.isObject = function (t) {
              return t && "object" == typeof t;
            }),
            (r.isset = r.isSet =
              function (t, i) {
                var n = t[i];
                return (
                  null != n &&
                  t.hasOwnProperty(i) &&
                  ("object" != typeof n ||
                    0 < (Array.isArray(n) ? n : Object.keys(n)).length)
                );
              }),
            (r.Buffer = (function () {
              try {
                var t = r.inquire("buffer").Buffer;
                return t.prototype.utf8Write ? t : null;
              } catch (t) {
                return null;
              }
            })()),
            (r.v = null),
            (r.b = null),
            (r.newBuffer = function (t) {
              return "number" == typeof t
                ? r.Buffer
                  ? r.b(t)
                  : new r.Array(t)
                : r.Buffer
                  ? r.v(t)
                  : "undefined" == typeof Uint8Array
                    ? t
                    : new Uint8Array(t);
            }),
            (r.Array = "undefined" != typeof Uint8Array ? Uint8Array : Array),
            (r.Long =
              (r.global.dcodeIO && r.global.dcodeIO.Long) ||
              r.global.Long ||
              r.inquire("long")),
            (r.key2Re = /^true|false|0|1$/),
            (r.key32Re = /^-?(?:0|[1-9][0-9]*)$/),
            (r.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/),
            (r.longToHash = function (t) {
              return t ? r.LongBits.from(t).toHash() : r.LongBits.zeroHash;
            }),
            (r.longFromHash = function (t, i) {
              t = r.LongBits.fromHash(t);
              return r.Long ? r.Long.fromBits(t.lo, t.hi, i) : t.toNumber(!!i);
            }),
            (r.merge = e),
            (r.lcFirst = function (t) {
              return (t[0] || "").toLowerCase() + t.substring(1);
            }),
            (r.newError = s),
            (r.ProtocolError = s("ProtocolError")),
            (r.oneOfGetter = function (t) {
              for (var n = {}, i = 0; i < t.length; ++i) n[t[i]] = 1;
              return function () {
                for (var t = Object.keys(this), i = t.length - 1; -1 < i; --i)
                  if (1 === n[t[i]] && this[t[i]] !== g && null !== this[t[i]])
                    return t[i];
              };
            }),
            (r.oneOfSetter = function (n) {
              return function (t) {
                for (var i = 0; i < n.length; ++i)
                  n[i] !== t && delete this[n[i]];
              };
            }),
            (r.toJSONOptions = {
              longs: String,
              enums: String,
              bytes: String,
              json: !0,
            }),
            (r.r = function () {
              var n = r.Buffer;
              n
                ? ((r.v =
                    (n.from !== Uint8Array.from && n.from) ||
                    function (t, i) {
                      return new n(t, i);
                    }),
                  (r.b =
                    n.allocUnsafe ||
                    function (t) {
                      return new n(t);
                    }))
                : (r.v = r.b = null);
            }));
        },
        { 1: 1, 10: 10, 2: 2, 34: 34, 4: 4, 6: 6, 7: 7, 9: 9 },
      ],
      36: [
        function (t, i, n) {
          i.exports = function (t) {
            var i = h.codegen(
                ["m"],
                t.name + "$verify",
              )('if(typeof m!=="object"||m===null)')(
                "return%j",
                "object expected",
              ),
              n = t.oneofsArray,
              r = {};
            n.length && i("var p={}");
            for (var e = 0; e < t.fieldsArray.length; ++e) {
              var s,
                u = t.i[e].resolve(),
                o = "m" + h.safeProp(u.name);
              (u.optional &&
                i("if(%s!=null&&m.hasOwnProperty(%j)){", o, u.name),
                u.map
                  ? (i("if(!util.isObject(%s))", o)("return%j", f(u, "object"))(
                      "var k=Object.keys(%s)",
                      o,
                    )("for(var i=0;i<k.length;++i){"),
                    (function (t, i, n) {
                      switch (i.keyType) {
                        case "int32":
                        case "uint32":
                        case "sint32":
                        case "fixed32":
                        case "sfixed32":
                          t("if(!util.key32Re.test(%s))", n)(
                            "return%j",
                            f(i, "integer key"),
                          );
                          break;
                        case "int64":
                        case "uint64":
                        case "sint64":
                        case "fixed64":
                        case "sfixed64":
                          t("if(!util.key64Re.test(%s))", n)(
                            "return%j",
                            f(i, "integer|Long key"),
                          );
                          break;
                        case "bool":
                          t("if(!util.key2Re.test(%s))", n)(
                            "return%j",
                            f(i, "boolean key"),
                          );
                      }
                    })(i, u, "k[i]"),
                    c(i, u, e, o + "[k[i]]")("}"))
                  : u.repeated
                    ? (i("if(!Array.isArray(%s))", o)(
                        "return%j",
                        f(u, "array"),
                      )("for(var i=0;i<%s.length;++i){", o),
                      c(i, u, e, o + "[i]")("}"))
                    : (u.partOf &&
                        ((s = h.safeProp(u.partOf.name)),
                        1 === r[u.partOf.name] &&
                          i("if(p%s===1)", s)(
                            "return%j",
                            u.partOf.name + ": multiple values",
                          ),
                        (r[u.partOf.name] = 1),
                        i("p%s=1", s)),
                      c(i, u, e, o)),
                u.optional && i("}"));
            }
            return i("return null");
          };
          var u = t(14),
            h = t(33);
          function f(t, i) {
            return (
              t.name +
              ": " +
              i +
              (t.repeated && "array" !== i
                ? "[]"
                : t.map && "object" !== i
                  ? "{k:" + t.keyType + "}"
                  : "") +
              " expected"
            );
          }
          function c(t, i, n, r) {
            if (i.resolvedType)
              if (i.resolvedType instanceof u) {
                t("switch(%s){", r)("default:")("return%j", f(i, "enum value"));
                for (
                  var e = Object.keys(i.resolvedType.values), s = 0;
                  s < e.length;
                  ++s
                )
                  t("case %i:", i.resolvedType.values[e[s]]);
                t("break")("}");
              } else
                t("{")("var e=types[%i].verify(%s);", n, r)("if(e)")(
                  "return%j+e",
                  i.name + ".",
                )("}");
            else
              switch (i.type) {
                case "int32":
                case "uint32":
                case "sint32":
                case "fixed32":
                case "sfixed32":
                  t("if(!util.isInteger(%s))", r)("return%j", f(i, "integer"));
                  break;
                case "int64":
                case "uint64":
                case "sint64":
                case "fixed64":
                case "sfixed64":
                  t(
                    "if(!util.isInteger(%s)&&!(%s&&util.isInteger(%s.low)&&util.isInteger(%s.high)))",
                    r,
                    r,
                    r,
                    r,
                  )("return%j", f(i, "integer|Long"));
                  break;
                case "float":
                case "double":
                  t('if(typeof %s!=="number")', r)("return%j", f(i, "number"));
                  break;
                case "bool":
                  t('if(typeof %s!=="boolean")', r)(
                    "return%j",
                    f(i, "boolean"),
                  );
                  break;
                case "string":
                  t("if(!util.isString(%s))", r)("return%j", f(i, "string"));
                  break;
                case "bytes":
                  t(
                    'if(!(%s&&typeof %s.length==="number"||util.isString(%s)))',
                    r,
                    r,
                    r,
                  )("return%j", f(i, "buffer"));
              }
            return t;
          }
        },
        { 14: 14, 33: 33 },
      ],
      37: [
        function (t, i, n) {
          var u = t(19);
          n[".google.protobuf.Any"] = {
            fromObject: function (t) {
              if (t && t["@type"]) {
                var i,
                  n = t["@type"].substring(1 + t["@type"].lastIndexOf("/")),
                  n = this.lookup(n);
                if (n)
                  return (
                    ~(i =
                      "." == (t["@type"][0] || "")
                        ? t["@type"].slice(1)
                        : t["@type"]).indexOf("/") || (i = "/" + i),
                    this.create({
                      type_url: i,
                      value: n.encode(n.fromObject(t)).finish(),
                    })
                  );
              }
              return this.fromObject(t);
            },
            toObject: function (t, i) {
              var n,
                r,
                e = "",
                s = "";
              return (
                i &&
                  i.json &&
                  t.type_url &&
                  t.value &&
                  ((s = t.type_url.substring(1 + t.type_url.lastIndexOf("/"))),
                  (e = t.type_url.substring(
                    0,
                    1 + t.type_url.lastIndexOf("/"),
                  )),
                  (n = this.lookup(s)) && (t = n.decode(t.value))),
                !(t instanceof this.ctor) && t instanceof u
                  ? ((n = t.$type.toObject(t, i)),
                    (r =
                      "." === t.$type.fullName[0]
                        ? t.$type.fullName.slice(1)
                        : t.$type.fullName),
                    (n["@type"] = s =
                      (e = "" === e ? "type.googleapis.com/" : e) + r),
                    n)
                  : this.toObject(t, i)
              );
            },
          };
        },
        { 19: 19 },
      ],
      38: [
        function (t, i, n) {
          i.exports = a;
          var r,
            e = t(35),
            s = e.LongBits,
            u = e.base64,
            o = e.utf8;
          function h(t, i, n) {
            ((this.fn = t), (this.len = i), (this.next = g), (this.val = n));
          }
          function f() {}
          function c(t) {
            ((this.head = t.head),
              (this.tail = t.tail),
              (this.len = t.len),
              (this.next = t.states));
          }
          function a() {
            ((this.len = 0),
              (this.head = new h(f, 0, 0)),
              (this.tail = this.head),
              (this.states = null));
          }
          function l() {
            return e.Buffer
              ? function () {
                  return (a.create = function () {
                    return new r();
                  })();
                }
              : function () {
                  return new a();
                };
          }
          function d(t, i, n) {
            i[n] = 255 & t;
          }
          function v(t, i) {
            ((this.len = t), (this.next = g), (this.val = i));
          }
          function b(t, i, n) {
            for (; t.hi; )
              ((i[n++] = (127 & t.lo) | 128),
                (t.lo = ((t.lo >>> 7) | (t.hi << 25)) >>> 0),
                (t.hi >>>= 7));
            for (; 127 < t.lo; )
              ((i[n++] = (127 & t.lo) | 128), (t.lo = t.lo >>> 7));
            i[n++] = t.lo;
          }
          function p(t, i, n) {
            ((i[n] = 255 & t),
              (i[n + 1] = (t >>> 8) & 255),
              (i[n + 2] = (t >>> 16) & 255),
              (i[n + 3] = t >>> 24));
          }
          ((a.create = l()),
            (a.alloc = function (t) {
              return new e.Array(t);
            }),
            e.Array !== Array &&
              (a.alloc = e.pool(a.alloc, e.Array.prototype.subarray)),
            (a.prototype.p = function (t, i, n) {
              return (
                (this.tail = this.tail.next = new h(t, i, n)),
                (this.len += i),
                this
              );
            }),
            ((v.prototype = Object.create(h.prototype)).fn = function (
              t,
              i,
              n,
            ) {
              for (; 127 < t; ) ((i[n++] = (127 & t) | 128), (t >>>= 7));
              i[n] = t;
            }),
            (a.prototype.uint32 = function (t) {
              return (
                (this.len += (this.tail = this.tail.next =
                  new v(
                    (t >>>= 0) < 128
                      ? 1
                      : t < 16384
                        ? 2
                        : t < 2097152
                          ? 3
                          : t < 268435456
                            ? 4
                            : 5,
                    t,
                  )).len),
                this
              );
            }),
            (a.prototype.int32 = function (t) {
              return t < 0 ? this.p(b, 10, s.fromNumber(t)) : this.uint32(t);
            }),
            (a.prototype.sint32 = function (t) {
              return this.uint32(((t << 1) ^ (t >> 31)) >>> 0);
            }),
            (a.prototype.int64 = a.prototype.uint64 =
              function (t) {
                t = s.from(t);
                return this.p(b, t.length(), t);
              }),
            (a.prototype.sint64 = function (t) {
              t = s.from(t).zzEncode();
              return this.p(b, t.length(), t);
            }),
            (a.prototype.bool = function (t) {
              return this.p(d, 1, t ? 1 : 0);
            }),
            (a.prototype.sfixed32 = a.prototype.fixed32 =
              function (t) {
                return this.p(p, 4, t >>> 0);
              }),
            (a.prototype.sfixed64 = a.prototype.fixed64 =
              function (t) {
                t = s.from(t);
                return this.p(p, 4, t.lo).p(p, 4, t.hi);
              }),
            (a.prototype.float = function (t) {
              return this.p(e.float.writeFloatLE, 4, t);
            }),
            (a.prototype.double = function (t) {
              return this.p(e.float.writeDoubleLE, 8, t);
            }));
          var y = e.Array.prototype.set
            ? function (t, i, n) {
                i.set(t, n);
              }
            : function (t, i, n) {
                for (var r = 0; r < t.length; ++r) i[n + r] = t[r];
              };
          ((a.prototype.bytes = function (t) {
            var i,
              n = t.length >>> 0;
            return n
              ? (e.isString(t) &&
                  ((i = a.alloc((n = u.length(t)))),
                  u.decode(t, i, 0),
                  (t = i)),
                this.uint32(n).p(y, n, t))
              : this.p(d, 1, 0);
          }),
            (a.prototype.string = function (t) {
              var i = o.length(t);
              return i ? this.uint32(i).p(o.write, i, t) : this.p(d, 1, 0);
            }),
            (a.prototype.fork = function () {
              return (
                (this.states = new c(this)),
                (this.head = this.tail = new h(f, 0, 0)),
                (this.len = 0),
                this
              );
            }),
            (a.prototype.reset = function () {
              return (
                this.states
                  ? ((this.head = this.states.head),
                    (this.tail = this.states.tail),
                    (this.len = this.states.len),
                    (this.states = this.states.next))
                  : ((this.head = this.tail = new h(f, 0, 0)), (this.len = 0)),
                this
              );
            }),
            (a.prototype.ldelim = function () {
              var t = this.head,
                i = this.tail,
                n = this.len;
              return (
                this.reset().uint32(n),
                n &&
                  ((this.tail.next = t.next), (this.tail = i), (this.len += n)),
                this
              );
            }),
            (a.prototype.finish = function () {
              for (
                var t = this.head.next,
                  i = this.constructor.alloc(this.len),
                  n = 0;
                t;

              )
                (t.fn(t.val, i, n), (n += t.len), (t = t.next));
              return i;
            }),
            (a.r = function (t) {
              ((r = t), (a.create = l()), r.r());
            }));
        },
        { 35: 35 },
      ],
      39: [
        function (t, i, n) {
          i.exports = s;
          var r = t(38),
            e =
              (((s.prototype = Object.create(r.prototype)).constructor = s),
              t(35));
          function s() {
            r.call(this);
          }
          function u(t, i, n) {
            t.length < 40
              ? e.utf8.write(t, i, n)
              : i.utf8Write
                ? i.utf8Write(t, n)
                : i.write(t, n);
          }
          ((s.r = function () {
            ((s.alloc = e.b),
              (s.writeBytesBuffer =
                e.Buffer &&
                e.Buffer.prototype instanceof Uint8Array &&
                "set" === e.Buffer.prototype.set.name
                  ? function (t, i, n) {
                      i.set(t, n);
                    }
                  : function (t, i, n) {
                      if (t.copy) t.copy(i, n, 0, t.length);
                      else for (var r = 0; r < t.length; ) i[n++] = t[r++];
                    }));
          }),
            (s.prototype.bytes = function (t) {
              var i = (t = e.isString(t) ? e.v(t, "base64") : t).length >>> 0;
              return (
                this.uint32(i),
                i && this.p(s.writeBytesBuffer, i, t),
                this
              );
            }),
            (s.prototype.string = function (t) {
              var i = e.Buffer.byteLength(t);
              return (this.uint32(i), i && this.p(u, i, t), this);
            }),
            s.r());
        },
        { 35: 35, 38: 38 },
      ],
    },
    {},
    [16],
  );
})();
// Spotify bootstrap/customization protobuf schema and patch configuration.
const spotifyJson = {
  options: { java_package: "com.smile.spotify.model" },
  nested: {
    BootstrapResponse: {
      oneofs: {
        ucsResponse: { oneof: ["ucsResponseV0"] },
        trialsFacadeResponse: { oneof: ["trialsFacadeResponseV1"] },
      },
      fields: {
        ucsResponseV0: { type: "UcsResponseWrapperV0", id: 2 },
        trialsFacadeResponseV1: {
          type: "TrialsFacadeResponseWrapperV1",
          id: 3,
        },
      },
    },
    UcsResponseWrapperV0: {
      oneofs: { result: { oneof: ["success", "error"] } },
      fields: {
        success: { type: "UcsResponseWrapperSuccess", id: 1 },
        error: { type: "UcsResponseWrapperError", id: 2 },
      },
    },
    UcsResponseWrapperSuccess: {
      fields: { customization: { type: "UcsResponseWrapper", id: 1 } },
    },
    UcsResponseWrapperError: {
      fields: {
        errorCode: { type: "int32", id: 1 },
        message: { type: "string", id: 2 },
        logId: { type: "string", id: 3 },
      },
    },
    TrialsFacadeResponseWrapperV1: {
      oneofs: { result: { oneof: ["success", "error"] } },
      fields: {
        success: { type: "TrialsFacadeResponseWrapperSuccess", id: 1 },
        error: { type: "TrialsFacadeResponseWrapperError", id: 2 },
      },
    },
    TrialsFacadeResponseWrapperError: {
      fields: {
        errorCode: { type: "int32", id: 1 },
        message: { type: "string", id: 2 },
        logId: { type: "string", id: 3 },
      },
    },
    TrialsFacadeResponseWrapperSuccess: {
      fields: { field1: { type: "int32", id: 1 } },
    },
    UcsResponseWrapper: {
      oneofs: { result: { oneof: ["success", "error"] } },
      fields: {
        success: { type: "UcsResponse", id: 1 },
        error: { type: "Error", id: 2 },
      },
    },
    UcsResponse: {
      oneofs: {
        resolveResult: { oneof: ["resolveSuccess", "resolveError"] },
        accountAttributesResult: {
          oneof: ["accountAttributesSuccess", "accountAttributesError"],
        },
      },
      fields: {
        resolveSuccess: { type: "ResolveResponse", id: 1 },
        resolveError: { type: "Error", id: 2 },
        accountAttributesSuccess: { type: "AccountAttributesResponse", id: 3 },
        accountAttributesError: { type: "Error", id: 4 },
        fetchTimeMillis: { type: "int64", id: 5 },
      },
    },
    ResolveResponse: {
      fields: { configuration: { type: "Configuration", id: 1 } },
    },
    Configuration: {
      fields: {
        configurationAssignmentId: { type: "string", id: 1 },
        fetchTimeMillis: { type: "int64", id: 2 },
        assignedValues: { rule: "repeated", type: "AssignedValue", id: 3 },
        policySnapshotId: { type: "int64", id: 4 },
      },
    },
    AssignedValue: {
      oneofs: {
        structuredValue: { oneof: ["boolValue", "intValue", "enumValue"] },
      },
      fields: {
        propertyId: { type: "Identifier", id: 1 },
        metadata: { type: "Metadata", id: 2 },
        boolValue: { type: "BoolValue", id: 3 },
        intValue: { type: "IntValue", id: 4 },
        enumValue: { type: "EnumValue", id: 5 },
      },
    },
    Identifier: {
      fields: {
        scope: { type: "string", id: 1 },
        name: { type: "string", id: 2 },
      },
    },
    Metadata: {
      fields: {
        policyId: { type: "int64", id: 1 },
        externalRealm: { type: "string", id: 2 },
        externalRealmId: { type: "int64", id: 3 },
      },
    },
    BoolValue: { fields: { value: { type: "bool", id: 1 } } },
    EnumValue: { fields: { value: { type: "string", id: 1 } } },
    IntValue: { fields: { value: { type: "int32", id: 1 } } },
    AccountAttributesResponse: {
      fields: {
        accountAttributes: {
          keyType: "string",
          type: "AccountAttribute",
          id: 1,
        },
      },
    },
    AccountAttribute: {
      oneofs: { value: { oneof: ["boolValue", "longValue", "stringValue"] } },
      fields: {
        boolValue: { type: "bool", id: 2 },
        longValue: { type: "int64", id: 3 },
        stringValue: { type: "string", id: 4 },
      },
    },
    Error: {
      fields: {
        errorCode: { type: "int32", id: 1 },
        errorMessage: { type: "string", id: 2 },
      },
    },
  },
};

const OVERRIDE_ASSIGNED_VALUES = [{"propertyId":{"scope":"ios-learning-homeonboardingpage-impl","name":"onboarding_page_enabled"},"metadata":{"policyId":"249059","externalRealm":"exp-planner","externalRealmId":"1197166"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-settings-platform","name":"is_playback_page_enabled"},"metadata":{"policyId":"519343","externalRealm":"exp-planner","externalRealmId":"10000765"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-canvas","name":"canvas_enabled_ipad"},"metadata":{"policyId":"529814","externalRealm":"exp-planner","externalRealmId":"1285545"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-ontour","name":"enable_nowplaying_scroll_events_card_on_ipad"},"metadata":{"policyId":"201591","externalRealm":"exp-planner","externalRealmId":"1182044"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-podcastpolls","name":"is_enabled_for_npv_on_ipad"},"metadata":{"policyId":"201591","externalRealm":"exp-planner","externalRealmId":"1182044"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-npvprovider","name":"watch_feed_in_npv_enabled_on_ipad"},"metadata":{"policyId":"350275","externalRealm":"exp-planner","externalRealmId":"1230437"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"send_is_tablet_header"},"metadata":{"policyId":"529814","externalRealm":"exp-planner","externalRealmId":"1285545"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-browse-browsepage-impl","name":"send_is_tablet_header"},"metadata":{"policyId":"529814","externalRealm":"exp-planner","externalRealmId":"1285545"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"metadata_position_in_main_feed"},"metadata":{"policyId":"564217","externalRealm":"exp-planner","externalRealmId":"10041141"},"enumValue":{"value":"bottom"}},{"propertyId":{"scope":"ios-adaptivelayout-experimentationmanager","name":"is_adaptive_layout_enabled"},"metadata":{"policyId":"529814","externalRealm":"exp-planner","externalRealmId":"1285545"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-adaptivelayout-experimentationmanager","name":"now_playing_view_initial_mode"},"metadata":{"policyId":"529814","externalRealm":"exp-planner","externalRealmId":"1285545"},"enumValue":{"value":"Collapsed"}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"additional_section_spacing_on_main_feed"},"metadata":{"policyId":"564217","externalRealm":"exp-planner","externalRealmId":"10041141"},"intValue":{"value":4}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"enable_edge_to_edge_video_mdc_in_main_feed"},"metadata":{"policyId":"569989","externalRealm":"exp-planner","externalRealmId":"1293737"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_age_assurance_restrictions_mv_integration"},"metadata":{"policyId":"455677","externalRealm":"exp-planner","externalRealmId":"1262150"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playbackcontrol-audiovideoswitcher-impl","name":"enable_age_assurance"},"metadata":{"policyId":"455677","externalRealm":"exp-planner","externalRealmId":"1262150"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-elements","name":"audio_video_switch_button_show_age_assurance_indicator"},"metadata":{"policyId":"455677","externalRealm":"exp-planner","externalRealmId":"1262150"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"use_mdc_for_previews_on_music_subfeed"},"metadata":{"policyId":"470442","externalRealm":"exp-planner","externalRealmId":"1259958"},"boolValue":{}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"use_mdc_for_previews_on_podcasts_subfeed"},"metadata":{"policyId":"470442","externalRealm":"exp-planner","externalRealmId":"1259958"},"boolValue":{}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"enable_edge_to_edge_video_mdc_in_subfeeds"},"metadata":{"policyId":"470442","externalRealm":"exp-planner","externalRealmId":"1259958"},"boolValue":{}},{"propertyId":{"scope":"ios-discovery-previewelement-impl","name":"enable_artist_prominence"},"metadata":{"policyId":"470442","externalRealm":"exp-planner","externalRealmId":"1259958"},"boolValue":{}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"use_mdc_for_previews_on_audiobooks_subfeed"},"metadata":{"policyId":"470442","externalRealm":"exp-planner","externalRealmId":"1259958"},"boolValue":{}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"enable_standard_mdc_in_subfeeds"},"metadata":{"policyId":"470442","externalRealm":"exp-planner","externalRealmId":"1259958"},"boolValue":{}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"use_mdc_for_previews_on_video_subfeed"},"metadata":{"policyId":"470442","externalRealm":"exp-planner","externalRealmId":"1259958"},"boolValue":{}},{"propertyId":{"scope":"ios-audio-journey","name":"is_custom_exposure_enabled"},"metadata":{"policyId":"472113","externalRealm":"exp-planner","externalRealmId":"1266321"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-audio-journey","name":"is_enabled"},"metadata":{"policyId":"472113","externalRealm":"exp-planner","externalRealmId":"1266321"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-audio-journey","name":"is_donation_enabled"},"metadata":{"policyId":"472113","externalRealm":"exp-planner","externalRealmId":"1266321"},"boolValue":{}},{"propertyId":{"scope":"ios-progressstate-model-impl","name":"episodes_resumption_api"},"metadata":{"policyId":"473366","externalRealm":"exp-planner","externalRealmId":"1267385"},"boolValue":{}},{"propertyId":{"scope":"ios-progressstate-model-impl","name":"audiobooks_resumption_api"},"metadata":{"policyId":"473366","externalRealm":"exp-planner","externalRealmId":"1267385"},"boolValue":{}},{"propertyId":{"scope":"ios-progressstate-durationformatter-impl","name":"unified_time_left_format"},"metadata":{"policyId":"473366","externalRealm":"exp-planner","externalRealmId":"1267385"},"boolValue":{}},{"propertyId":{"scope":"core-prefetch-feature","name":"media_prefetcher_segmented_files_enabled"},"metadata":{"policyId":"476026","externalRealm":"exp-planner","externalRealmId":"1268093"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-prefetch-feature","name":"media_prefetcher_feature_watch_feed_window_size"},"metadata":{"policyId":"476026","externalRealm":"exp-planner","externalRealmId":"1268093"},"intValue":{"value":10}},{"propertyId":{"scope":"core-automix","name":"auto_transition_fallback_cuepoint_vocal_cut_threshold"},"metadata":{"policyId":"478596","externalRealm":"exp-planner","externalRealmId":"1268296"},"intValue":{"value":10}},{"propertyId":{"scope":"core-automix","name":"auto_transition_fallback_cuepoint_selection_strategy"},"metadata":{"policyId":"478596","externalRealm":"exp-planner","externalRealmId":"1268296"},"enumValue":{"value":"First"}},{"propertyId":{"scope":"core-player","name":"play_history_shuffle_scorer_history_track_count"},"metadata":{"policyId":"482057","externalRealm":"exp-planner","externalRealmId":"1270440"},"intValue":{"value":80}},{"propertyId":{"scope":"core-player","name":"play_history_shuffle_scorer_context_history_track_count"},"metadata":{"policyId":"482057","externalRealm":"exp-planner","externalRealmId":"1270440"},"intValue":{"value":40}},{"propertyId":{"scope":"core-player","name":"play_history_shuffle_scorer_context_track_count"},"metadata":{"policyId":"482057","externalRealm":"exp-planner","externalRealmId":"1270440"},"intValue":{"value":40}},{"propertyId":{"scope":"core-connect-feature","name":"show_offline_devices_in_core"},"metadata":{"policyId":"9128","externalRealm":"exp-planner","externalRealmId":"33532"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-auth","name":"source_application_denylist_enabled"},"metadata":{"policyId":"10622","externalRealm":"exp-planner","externalRealmId":"12651"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-googleassistantintegration","name":"google_assistant_integration_enabled"},"metadata":{"policyId":"11522","externalRealm":"exp-planner","externalRealmId":"329345"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-spotifyappprotocol","name":"inter_app_protocol_close_connections_on_end_of_stream_events"},"metadata":{"policyId":"13303","externalRealm":"exp-planner","externalRealmId":"1001170"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-metadata-feature","name":"audio_files_prefetch_critical"},"metadata":{"policyId":"14249","externalRealm":"exp-planner","externalRealmId":"1005414"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-performancemetrics","name":"should_instrument_with_service_system_perf_tracker"},"metadata":{"policyId":"16873","externalRealm":"exp-planner","externalRealmId":"1015783"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-performancesdkintegration","name":"battery_instrumentation_enabled"},"metadata":{"policyId":"18011","externalRealm":"exp-planner","externalRealmId":"1022058"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-performancesdkintegration","name":"battery_instrumentation_report_interval"},"metadata":{"policyId":"18011","externalRealm":"exp-planner","externalRealmId":"1022058"},"intValue":{"value":1800}},{"propertyId":{"scope":"ios-feature-hearables","name":"spotify_go_access_control_enabled"},"metadata":{"policyId":"18164","externalRealm":"exp-planner","externalRealmId":"35192"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share","name":"is_useractivity_sharing_enabled"},"metadata":{"policyId":"18724","externalRealm":"exp-planner","externalRealmId":"1025828"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"offline2_write_resources_details_delay_milliseconds"},"metadata":{"policyId":"20840","externalRealm":"exp-planner","externalRealmId":"1036211"},"intValue":{"value":60000}},{"propertyId":{"scope":"core-collection-feature","name":"core_liked_songs_subjective_filters"},"metadata":{"policyId":"22632","externalRealm":"exp-planner","externalRealmId":"1043788"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibrarymusic","name":"liked_songs_filter_chips_source"},"metadata":{"policyId":"22632","externalRealm":"exp-planner","externalRealmId":"1043788"},"enumValue":{"value":"subjective"}},{"propertyId":{"scope":"ios-feature-remoteconfiguration","name":"remoteconfig_system_test"},"metadata":{"policyId":"23079","externalRealm":"exp-planner","externalRealmId":"1046189"},"enumValue":{"value":"Treatment"}},{"propertyId":{"scope":"ios-feature-remoteconfiguration","name":"remoteconfig_unauth_system_test"},"metadata":{"policyId":"24080","externalRealm":"exp-planner","externalRealmId":"1050719"},"enumValue":{"value":"Treatment"}},{"propertyId":{"scope":"ios-feature-unauth","name":"remoteconfig_unauth_system_test"},"metadata":{"policyId":"25920","externalRealm":"exp-planner","externalRealmId":"1059415"},"enumValue":{"value":"Treatment"}},{"propertyId":{"scope":"core-offline","name":"default_primary_resource_type"},"metadata":{"policyId":"27104","externalRealm":"exp-planner","externalRealmId":"35761"},"enumValue":{"value":"Video"}},{"propertyId":{"scope":"ios-feature-alexaaccountlinking","name":"alexa_account_linking_nudge_duration"},"metadata":{"policyId":"31783","externalRealm":"exp-planner","externalRealmId":"1001798"},"intValue":{"value":30}},{"propertyId":{"scope":"ios-feature-alexaaccountlinking","name":"alexa_account_linking_nudge_cadence"},"metadata":{"policyId":"31783","externalRealm":"exp-planner","externalRealmId":"1001798"},"intValue":{"value":7}},{"propertyId":{"scope":"ios-feature-partner","name":"voice_assistants_enabled"},"metadata":{"policyId":"31783","externalRealm":"exp-planner","externalRealmId":"1001798"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-bitrate","name":"net_fortune_coalesce_playback_id"},"metadata":{"policyId":"34013","externalRealm":"exp-planner","externalRealmId":"1093287"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-bitrate","name":"net_fortune_use_playback_stats"},"metadata":{"policyId":"34013","externalRealm":"exp-planner","externalRealmId":"1093287"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share-menu","name":"is_facebook_canvas_sharing_enabled"},"metadata":{"policyId":"35785","externalRealm":"exp-planner","externalRealmId":"1060827"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-screen-recording-detection","name":"screen_recording_detection_instrumentation_enabled"},"metadata":{"policyId":"36021","externalRealm":"exp-planner","externalRealmId":"1100127"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-hearables","name":"accessory_onboarding_enabled"},"metadata":{"policyId":"36712","externalRealm":"exp-planner","externalRealmId":"1095303"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-hearables","name":"jabra_elite_interactive_onboarding_enabled"},"metadata":{"policyId":"36712","externalRealm":"exp-planner","externalRealmId":"1095303"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"spiderman_easter_egg_enabled"},"metadata":{"policyId":"37723","externalRealm":"exp-planner","externalRealmId":"1110373"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"add_observers_on_scroll_only_when_view_appears"},"metadata":{"policyId":"40111","externalRealm":"exp-planner","externalRealmId":"1112346"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-crashreporter","name":"metric_kit_diagnostics_report_cpu_exception_stack_traces"},"metadata":{"policyId":"40641","externalRealm":"exp-planner","externalRealmId":"1112738"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-podcast-ads","name":"video_support"},"metadata":{"policyId":"44329","externalRealm":"exp-planner","externalRealmId":"1115129"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-podcast-ads","name":"activation_strategy"},"metadata":{"policyId":"44329","externalRealm":"exp-planner","externalRealmId":"1115129"},"enumValue":{"value":"late_mobius"}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"fullscreen_picture_in_picture"},"metadata":{"policyId":"50414","externalRealm":"exp-planner","externalRealmId":"1118864"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-audioadpictureinpicturecoordinator","name":"pip_enabled"},"metadata":{"policyId":"50414","externalRealm":"exp-planner","externalRealmId":"1118864"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"picture_in_picture"},"metadata":{"policyId":"50414","externalRealm":"exp-planner","externalRealmId":"1118864"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-settings","name":"pip_setting_section_enabled"},"metadata":{"policyId":"50414","externalRealm":"exp-planner","externalRealmId":"1118864"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"barbie_easter_egg_enabled"},"metadata":{"policyId":"50679","externalRealm":"exp-planner","externalRealmId":"1119211"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-browse","name":"section_pagination_enabled"},"metadata":{"policyId":"51390","externalRealm":"exp-planner","externalRealmId":"1115046"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-show-cosmos","name":"show_request_optimization_level"},"metadata":{"policyId":"58705","externalRealm":"exp-planner","externalRealmId":"1123149"},"enumValue":{"value":"None"}},{"propertyId":{"scope":"core-remote-config","name":"dummy_fruit_example"},"metadata":{"policyId":"59735","externalRealm":"exp-planner","externalRealmId":"1123617"},"enumValue":{"value":"Plum"}},{"propertyId":{"scope":"core-image","name":"enable_online_size_image_resolve"},"metadata":{"policyId":"61757","externalRealm":"exp-planner","externalRealmId":"1120273"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-image","name":"enable_online_image_resolve"},"metadata":{"policyId":"61757","externalRealm":"exp-planner","externalRealmId":"1120273"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-image-resolve","name":"enable_projection_map_loading"},"metadata":{"policyId":"61757","externalRealm":"exp-planner","externalRealmId":"1120273"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-download","name":"passthrough_episode_timeout_is_permanent"},"metadata":{"policyId":"104395","externalRealm":"exp-planner","externalRealmId":"1140477"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share-menu","name":"is_podcast_video_preview_enabled"},"metadata":{"policyId":"112112","externalRealm":"exp-planner","externalRealmId":"1140542"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-creditsplus-creditspluscard","name":"show_artist_images"},"metadata":{"policyId":"112436","externalRealm":"exp-planner","externalRealmId":"1146169"},"boolValue":{}},{"propertyId":{"scope":"core-context-track-exts","name":"enable_podcast_sponsored_content"},"metadata":{"policyId":"115694","externalRealm":"exp-planner","externalRealmId":"1148107"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-feature-readalong","name":"image_gallery_enabled"},"metadata":{"policyId":"123234","externalRealm":"exp-planner","externalRealmId":"1152881"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-episodecompanioncontent","name":"episode_companion_content_enabled"},"metadata":{"policyId":"123234","externalRealm":"exp-planner","externalRealmId":"1152881"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"pilot_shows_enabled"},"metadata":{"policyId":"123234","externalRealm":"exp-planner","externalRealmId":"1152881"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"rich_content_image_enabled"},"metadata":{"policyId":"123234","externalRealm":"exp-planner","externalRealmId":"1152881"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"looping_video_enabled"},"metadata":{"policyId":"123234","externalRealm":"exp-planner","externalRealmId":"1152881"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-context-track-exts","name":"enable_companion_content"},"metadata":{"policyId":"123234","externalRealm":"exp-planner","externalRealmId":"1152881"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lockscreen","name":"companion_content_enabled"},"metadata":{"policyId":"130827","externalRealm":"exp-planner","externalRealmId":"1156432"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"artwork_unit_view_enabled"},"metadata":{"policyId":"130827","externalRealm":"exp-planner","externalRealmId":"1156432"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-companioncontent","name":"information_unit_update_enabled"},"metadata":{"policyId":"130827","externalRealm":"exp-planner","externalRealmId":"1156432"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplayingbar","name":"companion_content_in_npb_enabled"},"metadata":{"policyId":"130827","externalRealm":"exp-planner","externalRealmId":"1156432"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"npv_entity_enabled"},"metadata":{"policyId":"137736","externalRealm":"exp-planner","externalRealmId":"1158759"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"read_along_entity_enabled"},"metadata":{"policyId":"137736","externalRealm":"exp-planner","externalRealmId":"1158759"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-blendentity","name":"add_tracks_enabled"},"metadata":{"policyId":"149314","externalRealm":"exp-planner","externalRealmId":"1163305"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-reporting-menuaction","name":"enable_course_reporting"},"metadata":{"policyId":"156262","externalRealm":"exp-planner","externalRealmId":"1165311"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-reporting-menuaction","name":"enable_course_lesson_reporting"},"metadata":{"policyId":"156262","externalRealm":"exp-planner","externalRealmId":"1165311"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"cover_art_mode_enabled"},"metadata":{"policyId":"161022","externalRealm":"exp-planner","externalRealmId":"1167557"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-download","name":"include_playback_id_header"},"metadata":{"policyId":"162713","externalRealm":"exp-planner","externalRealmId":"1168110"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-liveaudio-livestreampage","name":"context_menu_enabled"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-nowplayingliveroom","name":"content_reporting_forms_enabled"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-liveroomplayer","name":"ended_state_uses_iteration_count"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-liveaudio-livestreampage","name":"stream_to_main_enabled"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-listeningparties","name":"live_message_buffer_periodic_interval_millis"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"intValue":{"value":100}},{"propertyId":{"scope":"ios-system-listeningparties","name":"live_message_buffer_initial_interval_millis"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"intValue":{"value":100}},{"propertyId":{"scope":"ios-system-listeningparties","name":"coordinator_enabled"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-listeningparties","name":"live_message_rewind_seconds"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"intValue":{"value":180}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"livestream_ended_state_uses_iteration_count"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"boolValue":{}},{"propertyId":{"scope":"ios-system-listeningparties","name":"demo_mode_enabled"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"boolValue":{}},{"propertyId":{"scope":"ios-system-listeningparties","name":"live_message_max_delay_millis"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"intValue":{"value":20000}},{"propertyId":{"scope":"ios-feature-nowplayingliveroom","name":"live_room_npv_enabled"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-liveaudio-livestreampage","name":"livestream_page_enabled"},"metadata":{"policyId":"163165","externalRealm":"exp-planner","externalRealmId":"1168253"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-audio-track-player","name":"handle_track_deferred_close_after_stream_resumption"},"metadata":{"policyId":"180587","externalRealm":"exp-planner","externalRealmId":"1174191"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-podcast-ads","name":"send_ad_opportunity_event"},"metadata":{"policyId":"180587","externalRealm":"exp-planner","externalRealmId":"1174191"},"boolValue":{"value":true}},{"propertyId":{"scope":"cpp-player-rendering-renderer","name":"dont_pause_stopping_track"},"metadata":{"policyId":"180587","externalRealm":"exp-planner","externalRealmId":"1174191"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"update_all_batch_interval_milliseconds"},"metadata":{"policyId":"183159","externalRealm":"exp-planner","externalRealmId":"1174582"},"intValue":{"value":50}},{"propertyId":{"scope":"ios-feature-readalong","name":"content_layer_refresh_enabled"},"metadata":{"policyId":"184852","externalRealm":"exp-planner","externalRealmId":"1176244"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-podcastpolls","name":"should_show_polls_feature_in_episode_page"},"metadata":{"policyId":"197160","externalRealm":"exp-planner","externalRealmId":"1179236"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-podcastpolls","name":"is_enabled_on_npv_for_video_episodes"},"metadata":{"policyId":"197160","externalRealm":"exp-planner","externalRealmId":"1179236"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-context-track-exts","name":"enable_podcast_poll"},"metadata":{"policyId":"197160","externalRealm":"exp-planner","externalRealmId":"1179236"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"item_state_cache_size"},"metadata":{"policyId":"202081","externalRealm":"exp-planner","externalRealmId":"1182200"},"intValue":{"value":5000}},{"propertyId":{"scope":"ios-contextualattributesmanager-contextualsignals-impl","name":"contextual_signals_provider_enabled"},"metadata":{"policyId":"217598","externalRealm":"exp-planner","externalRealmId":"1186130"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-contextualattributesmanager","name":"home_reload_enabled"},"metadata":{"policyId":"217598","externalRealm":"exp-planner","externalRealmId":"1186130"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_comments_card"},"metadata":{"policyId":"221146","externalRealm":"exp-planner","externalRealmId":"1188422"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_reordering"},"metadata":{"policyId":"221146","externalRealm":"exp-planner","externalRealmId":"1188422"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-notificationsv2","name":"preferences_show_comments_category"},"metadata":{"policyId":"221146","externalRealm":"exp-planner","externalRealmId":"1188422"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_comments_card_episode_page"},"metadata":{"policyId":"221146","externalRealm":"exp-planner","externalRealmId":"1188422"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-context-track-exts","name":"enable_podcast_qna"},"metadata":{"policyId":"221146","externalRealm":"exp-planner","externalRealmId":"1188422"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_comment_card_cache"},"metadata":{"policyId":"221146","externalRealm":"exp-planner","externalRealmId":"1188422"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-prerelease-feature","name":"listening_party_card_enabled"},"metadata":{"policyId":"232401","externalRealm":"exp-planner","externalRealmId":"1188856"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-track-info-provider-feature","name":"batch_album_v4_lookups"},"metadata":{"policyId":"241365","externalRealm":"exp-planner","externalRealmId":"1194536"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-context-track-decorators-feature","name":"batch_artist_v4_lookups"},"metadata":{"policyId":"241365","externalRealm":"exp-planner","externalRealmId":"1194536"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"header_course_discount_info_hidden"},"metadata":{"policyId":"249716","externalRealm":"exp-planner","externalRealmId":"1190336"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"pokemon_easter_egg_enabled"},"metadata":{"policyId":"257373","externalRealm":"exp-planner","externalRealmId":"1199760"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-npvprovider","name":"is_personalised_discovery_playlist_heuristic_enabled"},"metadata":{"policyId":"262223","externalRealm":"exp-planner","externalRealmId":"1201490"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-prerelease-nowplayingviewprovider-impl","name":"npv_is_pre_saved_release_heuristic_enabled"},"metadata":{"policyId":"262223","externalRealm":"exp-planner","externalRealmId":"1201490"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"sanrio_easter_egg_enabled"},"metadata":{"policyId":"280693","externalRealm":"exp-planner","externalRealmId":"1207270"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"wicked_easter_egg_enabled"},"metadata":{"policyId":"284904","externalRealm":"exp-planner","externalRealmId":"1208516"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-elements","name":"explicit_label"},"metadata":{"policyId":"288365","externalRealm":"exp-planner","externalRealmId":"1176318"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"show_cover_art_on_videos"},"metadata":{"policyId":"288365","externalRealm":"exp-planner","externalRealmId":"1176318"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"explicit_label"},"metadata":{"policyId":"288365","externalRealm":"exp-planner","externalRealmId":"1176318"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-content-layer-platform","name":"enhance_content_layer"},"metadata":{"policyId":"288365","externalRealm":"exp-planner","externalRealmId":"1176318"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-nowplaying-scroll-impl","name":"enable_personalised_order_tiebreaker_logic"},"metadata":{"policyId":"293246","externalRealm":"exp-planner","externalRealmId":"1211184"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-collection-feature","name":"core_collection_endpoint_logger_enabled"},"metadata":{"policyId":"305361","externalRealm":"exp-planner","externalRealmId":"1216413"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-encore-experiments","name":"enable_adaptive_title_entities"},"metadata":{"policyId":"311646","externalRealm":"exp-planner","externalRealmId":"1202976"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ads","name":"state_update_on_ad_config_loaded"},"metadata":{"policyId":"311958","externalRealm":"exp-planner","externalRealmId":"1218595"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"album_presave_second_step_enabled"},"metadata":{"policyId":"312581","externalRealm":"exp-planner","externalRealmId":"1218665"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-premiumaccountmanagement","name":"is_plan_overview_v2_enabled"},"metadata":{"policyId":"312641","externalRealm":"exp-planner","externalRealmId":"1218720"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-videocoordinator","name":"stop_playback_on_stream_reporting_error"},"metadata":{"policyId":"316005","externalRealm":"exp-planner","externalRealmId":"1219550"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-gatedcontent","name":"gated_episode_query_parameter_enabled"},"metadata":{"policyId":"318717","externalRealm":"exp-planner","externalRealmId":"1219035"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-feature-impl","name":"horizontal_pivoting_onboarding_setting"},"metadata":{"policyId":"321178","externalRealm":"exp-planner","externalRealmId":"1221335"},"enumValue":{"value":"tooltip"}},{"propertyId":{"scope":"ios-feature-readalong","name":"card_cc_exclude_enabled"},"metadata":{"policyId":"324842","externalRealm":"exp-planner","externalRealmId":"1222252"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-device-predictability","name":"enable_where_to_play"},"metadata":{"policyId":"326818","externalRealm":"exp-planner","externalRealmId":"1215215"},"boolValue":{}},{"propertyId":{"scope":"ios-prerelease-nowplayingviewprovider-impl","name":"is_npv_scroll_element_migration_enabled"},"metadata":{"policyId":"327295","externalRealm":"exp-planner","externalRealmId":"1222135"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"complex_episode_description_number_of_lines"},"metadata":{"policyId":"327714","externalRealm":"exp-planner","externalRealmId":"1223543"},"intValue":{"value":3}},{"propertyId":{"scope":"ios-feature-search","name":"complex_episode_description_prefix_metadata"},"metadata":{"policyId":"327714","externalRealm":"exp-planner","externalRealmId":"1223543"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-modes","name":"audio_switch_button_animated_for_music_videos"},"metadata":{"policyId":"334021","externalRealm":"exp-planner","externalRealmId":"1221687"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ads","name":"music_adt_enabled"},"metadata":{"policyId":"343523","externalRealm":"exp-planner","externalRealmId":"1227982"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-podcast-ads","name":"podcast_adt_enabled"},"metadata":{"policyId":"343523","externalRealm":"exp-planner","externalRealmId":"1227982"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-liveevents-contextmenu","name":"enable_report_concert_issue"},"metadata":{"policyId":"346340","externalRealm":"exp-planner","externalRealmId":"1225305"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-premiumaccountmanagement","name":"is_plan_details_v2_enabled"},"metadata":{"policyId":"347197","externalRealm":"exp-planner","externalRealmId":"1228195"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"complex_audiobook_row_rating_enabled"},"metadata":{"policyId":"348632","externalRealm":"exp-planner","externalRealmId":"1226624"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"enable_album_new_releases_signifier"},"metadata":{"policyId":"350359","externalRealm":"exp-planner","externalRealmId":"1226390"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-elements","name":"queued_badge"},"metadata":{"policyId":"351206","externalRealm":"exp-planner","externalRealmId":"1227584"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplayingbar","name":"queue_badge"},"metadata":{"policyId":"351206","externalRealm":"exp-planner","externalRealmId":"1227584"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-containerui","name":"root_page_top_offset_adjustment"},"metadata":{"policyId":"351446","externalRealm":"exp-planner","externalRealmId":"1230403"},"enumValue":{"value":"small"}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"ubi_impression_v2_logging_enabled"},"metadata":{"policyId":"354414","externalRealm":"exp-planner","externalRealmId":"1231655"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_sillywalk_rules"},"metadata":{"policyId":"360333","externalRealm":"exp-planner","externalRealmId":"1233649"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"enable_highlight_component"},"metadata":{"policyId":"360527","externalRealm":"exp-planner","externalRealmId":"1231252"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-viewpageimpl","name":"ubi_impression_v2_logging_enabled"},"metadata":{"policyId":"365653","externalRealm":"exp-planner","externalRealmId":"1232172"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-collection-feature","name":"extended_episode_publish_date_indexing"},"metadata":{"policyId":"369538","externalRealm":"exp-planner","externalRealmId":"1236520"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-listuxplatform-freetierplaylistpage-impl","name":"ubi_impression_v2_logging_enabled"},"metadata":{"policyId":"372583","externalRealm":"exp-planner","externalRealmId":"1237645"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-personalizedsets-recsquality-impl","name":"is_quicksilver_trigger_enabled"},"metadata":{"policyId":"375625","externalRealm":"exp-planner","externalRealmId":"1238501"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"complex_playlist_row_descriptors_in_secondary_subtitle"},"metadata":{"policyId":"376775","externalRealm":"exp-planner","externalRealmId":"1237935"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-reporting-menuaction","name":"enable_author_reporting"},"metadata":{"policyId":"377461","externalRealm":"exp-planner","externalRealmId":"1236822"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-aidjinteractivity-impl","name":"enable_mic_permission_declined_narration"},"metadata":{"policyId":"381771","externalRealm":"exp-planner","externalRealmId":"1240382"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-aidjinteractivity-impl","name":"enable_mic_permission_dialog_pause"},"metadata":{"policyId":"381771","externalRealm":"exp-planner","externalRealmId":"1240382"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-aidjinteractivity-impl","name":"enable_fullscreen_microphone_request"},"metadata":{"policyId":"381771","externalRealm":"exp-planner","externalRealmId":"1240382"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share-menu","name":"is_ig_audio_preview_entity_uri_enabled"},"metadata":{"policyId":"383584","externalRealm":"exp-planner","externalRealmId":"1241245"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"save_actions_first_step_enabled"},"metadata":{"policyId":"384838","externalRealm":"exp-planner","externalRealmId":"1241608"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"album_presave_first_step_enabled"},"metadata":{"policyId":"384838","externalRealm":"exp-planner","externalRealmId":"1241608"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-aidjinteractivity-impl","name":"enable_voice_improvements"},"metadata":{"policyId":"385613","externalRealm":"exp-planner","externalRealmId":"1241087"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-djsettings-impl","name":"enable_setting_dj_improvements"},"metadata":{"policyId":"385613","externalRealm":"exp-planner","externalRealmId":"1241087"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_comment_threads_proto"},"metadata":{"policyId":"386974","externalRealm":"exp-planner","externalRealmId":"1235293"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_comment_threads"},"metadata":{"policyId":"386974","externalRealm":"exp-planner","externalRealmId":"1235293"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"seeking_thumbnail_enabled"},"metadata":{"policyId":"391474","externalRealm":"exp-planner","externalRealmId":"1241634"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"scrubbing_thumbnail_enabled"},"metadata":{"policyId":"391474","externalRealm":"exp-planner","externalRealmId":"1241634"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"fullscreen_scrubbing_thumbnail_enabled"},"metadata":{"policyId":"391474","externalRealm":"exp-planner","externalRealmId":"1241634"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-hearables","name":"sony_headphones_onboarding_enabled"},"metadata":{"policyId":"392340","externalRealm":"exp-planner","externalRealmId":"1230664"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-accessory-onboarding","name":"enable_simple_cache"},"metadata":{"policyId":"392340","externalRealm":"exp-planner","externalRealmId":"1230664"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-musicvideos-interceptor-impl","name":"play_command_interceptor_enabled"},"metadata":{"policyId":"395542","externalRealm":"exp-planner","externalRealmId":"1244680"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistuxplatformconsumers-musicvideoplaylistplugin","name":"enable_interceptor_on_video_rows"},"metadata":{"policyId":"395542","externalRealm":"exp-planner","externalRealmId":"1244680"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-musicvideos-musicvideoplaylistimpl","name":"enable_interceptor_on_video_rows"},"metadata":{"policyId":"395542","externalRealm":"exp-planner","externalRealmId":"1244680"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"video_interceptor_enabled"},"metadata":{"policyId":"395542","externalRealm":"exp-planner","externalRealmId":"1244680"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lockscreen","name":"show_video_indicator_mv"},"metadata":{"policyId":"400075","externalRealm":"exp-planner","externalRealmId":"1246323"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-cast","name":"clear_cast_devices_when_offline"},"metadata":{"policyId":"406790","externalRealm":"exp-planner","externalRealmId":"1245679"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-messagebox","name":"message_box_permissions_min_days_after_dismissed"},"metadata":{"policyId":"407137","externalRealm":"exp-planner","externalRealmId":"1248323"},"intValue":{"value":14}},{"propertyId":{"scope":"ios-upcoming-releaseshubpage-impl","name":"is_page_enabled"},"metadata":{"policyId":"407305","externalRealm":"exp-planner","externalRealmId":"1248396"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"crossword_section_enabled"},"metadata":{"policyId":"407517","externalRealm":"exp-planner","externalRealmId":"1248351"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"more_results_header_after_crossword_flatlist_enabled"},"metadata":{"policyId":"407517","externalRealm":"exp-planner","externalRealmId":"1248351"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-browse-browsepage-impl","name":"ubi_impression_v2_logging_enabled"},"metadata":{"policyId":"416686","externalRealm":"exp-planner","externalRealmId":"1250959"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-subscriptionmanagement-removememberpage-impl","name":"remove_member_page_enabled"},"metadata":{"policyId":"419264","externalRealm":"exp-planner","externalRealmId":"1250671"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-memberdetailspage-impl","name":"remove_member_page_entry_point_enabled"},"metadata":{"policyId":"419264","externalRealm":"exp-planner","externalRealmId":"1250671"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-memberdetailspage-impl","name":"allocations_enabled"},"metadata":{"policyId":"419264","externalRealm":"exp-planner","externalRealmId":"1250671"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-subscriptionmanagement-allocationrequestdialogpage-impl","name":"allocation_request_dialog_inline_error_enabled"},"metadata":{"policyId":"419273","externalRealm":"exp-planner","externalRealmId":"1250663"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-subscriptionmanagement-allocationrequestdialogpage-impl","name":"allocation_request_dialog_enabled"},"metadata":{"policyId":"419273","externalRealm":"exp-planner","externalRealmId":"1250663"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"video_first_mode_configuration"},"metadata":{"policyId":"420730","externalRealm":"exp-planner","externalRealmId":"1250249"},"enumValue":{"value":"space_saver"}},{"propertyId":{"scope":"ios-nowplaying-contentlayers-impl","name":"video_first_content_type"},"metadata":{"policyId":"420730","externalRealm":"exp-planner","externalRealmId":"1250249"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-videorecommendations-npvprovider-impl","name":"disable_video_preview"},"metadata":{"policyId":"420730","externalRealm":"exp-planner","externalRealmId":"1250249"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"sentence_trimming_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-elements","name":"duration_element_ad_detection_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-chapterslist","name":"ad_detection_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"creator_timestamp_play_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"stand_alone_page_ad_detection_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"npv_passthrough_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"low_precision_check_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-share-podcast-timestamp-provider","name":"is_passthrough_creator_timestamp_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"share_link_start_position_resolving_timeout"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"intValue":{"value":3000}},{"propertyId":{"scope":"ios-feature-episodechapters","name":"ad_detection_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"content_layer_migration_enabled"},"metadata":{"policyId":"426176","externalRealm":"exp-planner","externalRealmId":"1252761"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-home-podcastfollowfeedpage-impl","name":"kodiak_enabled"},"metadata":{"policyId":"426773","externalRealm":"exp-planner","externalRealmId":"1253119"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"wednesday_easter_egg"},"metadata":{"policyId":"429466","externalRealm":"exp-planner","externalRealmId":"1254251"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"instant_mix_section_enabled"},"metadata":{"policyId":"430710","externalRealm":"exp-planner","externalRealmId":"1255625"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"simplified_instant_mix_row_enabled"},"metadata":{"policyId":"430710","externalRealm":"exp-planner","externalRealmId":"1255625"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"optimized_instant_mix_section_enabled"},"metadata":{"policyId":"430710","externalRealm":"exp-planner","externalRealmId":"1255625"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"concerts_enabled"},"metadata":{"policyId":"433113","externalRealm":"exp-planner","externalRealmId":"1255774"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-videorecommendations-elements-impl","name":"two_lines_for_title_for_podcasts_enabled"},"metadata":{"policyId":"434169","externalRealm":"exp-planner","externalRealmId":"1252512"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-videorecommendations-npvprovider-impl","name":"episode_video_recs_enabled"},"metadata":{"policyId":"434169","externalRealm":"exp-planner","externalRealmId":"1252512"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-videorecommendations-elements-impl","name":"duration_label_enabled"},"metadata":{"policyId":"434169","externalRealm":"exp-planner","externalRealmId":"1252512"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-videorecommendations-elements-impl","name":"save_button_enabled"},"metadata":{"policyId":"434169","externalRealm":"exp-planner","externalRealmId":"1252512"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-videorecommendations-elements-impl","name":"inline_release_date_enabled"},"metadata":{"policyId":"434169","externalRealm":"exp-planner","externalRealmId":"1252512"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-messaging-reduceinterventions-impl","name":"enabled"},"metadata":{"policyId":"436788","externalRealm":"exp-planner","externalRealmId":"1257288"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-messaging-reduceinterventions-impl","name":"enable_message_reinvent_free_n_p_v_suggestions_upsell"},"metadata":{"policyId":"436788","externalRealm":"exp-planner","externalRealmId":"1257288"},"boolValue":{}},{"propertyId":{"scope":"ios-messaging-reduceinterventions-impl","name":"max_account_age_days"},"metadata":{"policyId":"436788","externalRealm":"exp-planner","externalRealmId":"1257288"},"intValue":{"value":65536}},{"propertyId":{"scope":"ios-feature-createmenu","name":"should_animate_with_constraints"},"metadata":{"policyId":"440223","externalRealm":"exp-planner","externalRealmId":"1244405"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-campfire-properties-impl","name":"onboarding_label_share_sheet_enabled"},"metadata":{"policyId":"441785","externalRealm":"exp-planner","externalRealmId":"1250456"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-campfire-properties-impl","name":"onboarding_label_side_drawer_enabled"},"metadata":{"policyId":"441785","externalRealm":"exp-planner","externalRealmId":"1250456"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ads","name":"enable_ad_request_metrics"},"metadata":{"policyId":"442441","externalRealm":"exp-planner","externalRealmId":"1259113"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ads","name":"ad_request_metrics_sample_every_n"},"metadata":{"policyId":"442441","externalRealm":"exp-planner","externalRealmId":"1259113"},"intValue":{"value":1}},{"propertyId":{"scope":"ios-feature-premium-destination-badge","name":"badge_enabled"},"metadata":{"policyId":"445157","externalRealm":"exp-planner","externalRealmId":"1259760"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-connectivity","name":"perimeter_host_authoriser_enabled"},"metadata":{"policyId":"445419","externalRealm":"exp-planner","externalRealmId":"1259778"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lyrics","name":"is_get_lyrics_v2_enabled"},"metadata":{"policyId":"448101","externalRealm":"exp-planner","externalRealmId":"1260264"},"boolValue":{"value":true}},{"propertyId":{"scope":"cpp-player-rendering-renderer","name":"context_player_controls_playback_speed"},"metadata":{"policyId":"449320","externalRealm":"exp-planner","externalRealmId":"1254348"},"boolValue":{}},{"propertyId":{"scope":"ios-playbackcontrol-podcastplaybackspeedplatform-impl","name":"use_playback_settings_system"},"metadata":{"policyId":"449320","externalRealm":"exp-planner","externalRealmId":"1254348"},"boolValue":{}},{"propertyId":{"scope":"core-player","name":"enable_shared_global_playback_settings"},"metadata":{"policyId":"449320","externalRealm":"exp-planner","externalRealmId":"1254348"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-search","name":"save_actions_recents_enabled"},"metadata":{"policyId":"451434","externalRealm":"exp-planner","externalRealmId":"1261664"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ads","name":"mark_last_ad_break_time_for_preroll"},"metadata":{"policyId":"454964","externalRealm":"exp-planner","externalRealmId":"1261510"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ads","name":"always_keep_preroll_slot_filled"},"metadata":{"policyId":"454964","externalRealm":"exp-planner","externalRealmId":"1261510"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-your-plan-sidedrawer","name":"is_row_enabled"},"metadata":{"policyId":"455090","externalRealm":"exp-planner","externalRealmId":"1255504"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_shuffle_order_event"},"metadata":{"policyId":"456873","externalRealm":"exp-planner","externalRealmId":"1263032"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"shuffle_sequence_event_tracks_limit"},"metadata":{"policyId":"456873","externalRealm":"exp-planner","externalRealmId":"1263032"},"intValue":{"value":50}},{"propertyId":{"scope":"core-player","name":"enable_shuffle_context_event"},"metadata":{"policyId":"456873","externalRealm":"exp-planner","externalRealmId":"1263032"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-carplayv2","name":"batched_artwork_loading_enabled"},"metadata":{"policyId":"460076","externalRealm":"exp-planner","externalRealmId":"1264012"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lyrics","name":"is_lyrics_card_element_enabled"},"metadata":{"policyId":"460891","externalRealm":"exp-planner","externalRealmId":"1231502"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-search","name":"lyrics_match_pretitle_first_step_enabled"},"metadata":{"policyId":"461895","externalRealm":"exp-planner","externalRealmId":"1259942"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"lyrics_match_snippet_second_step_enabled"},"metadata":{"policyId":"461895","externalRealm":"exp-planner","externalRealmId":"1259942"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-externalintegration","name":"enable_content_playability_filtering"},"metadata":{"policyId":"462002","externalRealm":"exp-planner","externalRealmId":"1264616"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-segment-context-loader-feature","name":"segment_context_loader"},"metadata":{"policyId":"462645","externalRealm":"exp-planner","externalRealmId":"1261934"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-search-recentslist-impl","name":"gray_out_unplayable_tracks_enabled"},"metadata":{"policyId":"463433","externalRealm":"exp-planner","externalRealmId":"1264629"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-livesharing-google-meet","name":"enable_integration"},"metadata":{"policyId":"464774","externalRealm":"exp-planner","externalRealmId":"1258221"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-sociallisteningpartnerintegrations-controller-impl","name":"pause_playback_delay_millis"},"metadata":{"policyId":"464774","externalRealm":"exp-planner","externalRealmId":"1258221"},"intValue":{"value":1000}},{"propertyId":{"scope":"ios-planoverviewpage-impl","name":"unboxing_entry_point"},"metadata":{"policyId":"464819","externalRealm":"exp-planner","externalRealmId":"1265417"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-unboxing-hub","name":"premium_entry_modal"},"metadata":{"policyId":"464819","externalRealm":"exp-planner","externalRealmId":"1265417"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-feature-unboxing-hub","name":"premium_entry_banner"},"metadata":{"policyId":"464819","externalRealm":"exp-planner","externalRealmId":"1265417"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-feature-unboxingentrypointavailability","name":"your_premium_benefits_entry_point"},"metadata":{"policyId":"464819","externalRealm":"exp-planner","externalRealmId":"1265417"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-jam","name":"enable_reduce_connect_updates"},"metadata":{"policyId":"465747","externalRealm":"exp-planner","externalRealmId":"1265637"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-ignoreinrecs-ignoreinrecs-impl","name":"show_track_exclude_menu_item"},"metadata":{"policyId":"465802","externalRealm":"exp-planner","externalRealmId":"1265469"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-episodechapters","name":"now_playing_chapters_card_element_migration_enabled"},"metadata":{"policyId":"466078","externalRealm":"exp-planner","externalRealmId":"1265683"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-partneraiassistant-metawearables","name":"use_new_playback_controller"},"metadata":{"policyId":"469190","externalRealm":"exp-planner","externalRealmId":"1257606"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"element_api_second_step_enabled"},"metadata":{"policyId":"469987","externalRealm":"exp-planner","externalRealmId":"1266976"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"element_api_first_step_enabled"},"metadata":{"policyId":"470011","externalRealm":"exp-planner","externalRealmId":"1266972"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"venues_enabled"},"metadata":{"policyId":"470397","externalRealm":"exp-planner","externalRealmId":"1266687"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-learnmoresheet","name":"enable_invites_learn_more_sheet"},"metadata":{"policyId":"472242","externalRealm":"exp-planner","externalRealmId":"1267440"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-messaginguiimpl","name":"enable_host_approval_flow"},"metadata":{"policyId":"472242","externalRealm":"exp-planner","externalRealmId":"1267440"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-pendingrequestssheet","name":"enable_pending_request_sheet"},"metadata":{"policyId":"472242","externalRealm":"exp-planner","externalRealmId":"1267440"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-sociallistening-attachments-impl","name":"is_waiting_host_approval_hat_enabled"},"metadata":{"policyId":"472242","externalRealm":"exp-planner","externalRealmId":"1267440"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-canceljoinrequestsheet","name":"enable_cancel_join_jam_request_sheet"},"metadata":{"policyId":"472242","externalRealm":"exp-planner","externalRealmId":"1267440"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-sociallisteningconnectentitylogic","name":"enable_phone_speaker_host_approval"},"metadata":{"policyId":"472242","externalRealm":"exp-planner","externalRealmId":"1267440"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-hostapprovalimpl","name":"enable_host_approval_loop"},"metadata":{"policyId":"472242","externalRealm":"exp-planner","externalRealmId":"1267440"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-jamdevicepickerintegration","name":"enable_host_approval_flow"},"metadata":{"policyId":"472242","externalRealm":"exp-planner","externalRealmId":"1267440"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-sociallisteningconnectentitylogic","name":"enable_host_approval_flow"},"metadata":{"policyId":"472242","externalRealm":"exp-planner","externalRealmId":"1267440"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-curation-state-feature","name":"core_include_your_episodes"},"metadata":{"policyId":"473030","externalRealm":"exp-planner","externalRealmId":"1267397"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-your-library-feature","name":"core_predefined_playlist_for_ye"},"metadata":{"policyId":"473030","externalRealm":"exp-planner","externalRealmId":"1267397"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-podcastuiplatform-podcastimpl","name":"load_episodes_using_list_platform_enabled"},"metadata":{"policyId":"473239","externalRealm":"exp-planner","externalRealmId":"1267842"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-connectflags","name":"enable_page_api_for_new_picker"},"metadata":{"policyId":"473445","externalRealm":"exp-planner","externalRealmId":"1268063"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-playlist-feature","name":"playlist_sync_events_logging_level"},"metadata":{"policyId":"473946","externalRealm":"exp-planner","externalRealmId":"1268265"},"enumValue":{"value":"Error"}},{"propertyId":{"scope":"ios-endless-aidjinteractivity-impl","name":"is_interactivity_allowed_for_es_mx"},"metadata":{"policyId":"474223","externalRealm":"exp-planner","externalRealmId":"1267345"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-djmusic-impl","name":"interactivity_container_entrypoint"},"metadata":{"policyId":"474223","externalRealm":"exp-planner","externalRealmId":"1267345"},"enumValue":{"value":"tap"}},{"propertyId":{"scope":"ios-feature-yourupdates","name":"feature_enabled"},"metadata":{"policyId":"474382","externalRealm":"exp-planner","externalRealmId":"1268402"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline-search-feature","name":"include_cached_tracks"},"metadata":{"policyId":"475175","externalRealm":"exp-planner","externalRealmId":"1266534"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"updated_offline_header_titles_enabled"},"metadata":{"policyId":"475175","externalRealm":"exp-planner","externalRealmId":"1266534"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-connectflags","name":"remove_secondary_audio_should_be_silenced_hint"},"metadata":{"policyId":"476086","externalRealm":"exp-planner","externalRealmId":"1268321"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-live","name":"enable_concert_feed_view"},"metadata":{"policyId":"476455","externalRealm":"exp-planner","externalRealmId":"1267924"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-live","name":"enable_live_events_page"},"metadata":{"policyId":"476455","externalRealm":"exp-planner","externalRealmId":"1267924"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-blendentity","name":"referrals_entrypoint_section_enabled"},"metadata":{"policyId":"478979","externalRealm":"exp-planner","externalRealmId":"1269842"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-share-menu","name":"is_track_uri_to_facebook_stories_enabled"},"metadata":{"policyId":"479060","externalRealm":"exp-planner","externalRealmId":"1268937"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"bitrate_downgrade_non_lossless"},"metadata":{"policyId":"479596","externalRealm":"exp-planner","externalRealmId":"1270022"},"boolValue":{}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"bitrate_downgrade"},"metadata":{"policyId":"479596","externalRealm":"exp-planner","externalRealmId":"1270022"},"enumValue":{"value":"AudioBufferSize"}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"darkload_dowgrading"},"metadata":{"policyId":"479596","externalRealm":"exp-planner","externalRealmId":"1270022"},"boolValue":{}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"min_buffer_for_buffer_monitoring_to_start"},"metadata":{"policyId":"479596","externalRealm":"exp-planner","externalRealmId":"1270022"},"intValue":{"value":2000}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"bitrate_downgrade_target_bitrate"},"metadata":{"policyId":"479596","externalRealm":"exp-planner","externalRealmId":"1270022"},"intValue":{"value":320000}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"send_midtrack_downgrade_event"},"metadata":{"policyId":"479596","externalRealm":"exp-planner","externalRealmId":"1270022"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"critical_buffer_threshold_for_bitrate_downgrade"},"metadata":{"policyId":"479596","externalRealm":"exp-planner","externalRealmId":"1270022"},"intValue":{"value":1500}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"playback_options_button"},"metadata":{"policyId":"481135","externalRealm":"exp-planner","externalRealmId":"1270613"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"pip_video_playback_option"},"metadata":{"policyId":"481135","externalRealm":"exp-planner","externalRealmId":"1270613"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-watchplatform","name":"apple_watch_offline"},"metadata":{"policyId":"30748","externalRealm":"exp-planner","externalRealmId":"1080441"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-reporting-menuaction","name":"enable_audiobook_book_reporting"},"metadata":{"policyId":"32011","externalRealm":"exp-planner","externalRealmId":"1165623"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-reporting-menuaction","name":"enable_audiobook_chapter_reporting"},"metadata":{"policyId":"32011","externalRealm":"exp-planner","externalRealmId":"1165623"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-performancesdkintegration","name":"should_send_time_measurements"},"metadata":{"policyId":"32014","externalRealm":"exp-planner","externalRealmId":"1212902"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-show-context-loader-feature","name":"show_context_loader"},"metadata":{"policyId":"32046","externalRealm":"exp-planner","externalRealmId":"1086069"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share","name":"is_instagram_direct_message_sharing_enabled"},"metadata":{"policyId":"32092","externalRealm":"exp-planner","externalRealmId":"1175571"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-stream-reporting-feature","name":"send_uct_streamed_decision"},"metadata":{"policyId":"32124","externalRealm":"exp-planner","externalRealmId":"1086253"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-login","name":"delayed_sia_verification_enabled"},"metadata":{"policyId":"32136","externalRealm":"exp-planner","externalRealmId":"1086256"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share","name":"is_facebook_messenger_sharing_enabled"},"metadata":{"policyId":"32160","externalRealm":"exp-planner","externalRealmId":"1086296"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-image","name":"enable_image_resolve"},"metadata":{"policyId":"32222","externalRealm":"exp-planner","externalRealmId":"1115941"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-remoteconfiguration","name":"button_color_dummy_property"},"metadata":{"policyId":"32290","externalRealm":"exp-planner","externalRealmId":"1086624"},"enumValue":{"value":"Blue"}},{"propertyId":{"scope":"ios-feature-encoreintegration","name":"lottie_automatic_renderingengine_enabled"},"metadata":{"policyId":"32411","externalRealm":"exp-planner","externalRealmId":"1090353"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"black_panther_easter_egg_enabled"},"metadata":{"policyId":"32416","externalRealm":"exp-planner","externalRealmId":"1087066"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-sociallisteningconnectentitylogic","name":"nearby_session_invitation_enabled"},"metadata":{"policyId":"32811","externalRealm":"exp-planner","externalRealmId":"1088543"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"allow_fades_longer_than_duration"},"metadata":{"policyId":"33287","externalRealm":"exp-planner","externalRealmId":"1090339"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"metadata_5xx_backoff_seconds"},"metadata":{"policyId":"33555","externalRealm":"exp-planner","externalRealmId":"1097050"},"intValue":{"value":900}},{"propertyId":{"scope":"ios-feature-carplayv2","name":"accessory_definition_from_system_enabled"},"metadata":{"policyId":"33922","externalRealm":"exp-planner","externalRealmId":"1092898"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-premiumdestination","name":"premium_destination_swift_content_operations_enabled"},"metadata":{"policyId":"33956","externalRealm":"exp-planner","externalRealmId":"1105471"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-eventsender","name":"should_migrate_database"},"metadata":{"policyId":"34330","externalRealm":"exp-planner","externalRealmId":"1263859"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-connectnotifications","name":"show_your_dj_nudge"},"metadata":{"policyId":"35518","externalRealm":"exp-planner","externalRealmId":"1136326"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ads","name":"enable_state_fetch_system"},"metadata":{"policyId":"35903","externalRealm":"exp-planner","externalRealmId":"1101252"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-assistedcurationmigration","name":"suggested_episodes_card_enabled"},"metadata":{"policyId":"37470","externalRealm":"exp-planner","externalRealmId":"1109353"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-assistedcuration","name":"episode_search_preview_enabled"},"metadata":{"policyId":"37470","externalRealm":"exp-planner","externalRealmId":"1109353"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-assistedcuration","name":"episode_preview_enabled"},"metadata":{"policyId":"37470","externalRealm":"exp-planner","externalRealmId":"1109353"},"boolValue":{}},{"propertyId":{"scope":"core-media-parsers-feature","name":"use_platform_media_parser_for_image_loading"},"metadata":{"policyId":"37526","externalRealm":"exp-planner","externalRealmId":"1109553"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-canvas","name":"canvas_enabled"},"metadata":{"policyId":"37855","externalRealm":"exp-planner","externalRealmId":"1110746"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"live_room_mode_enabled"},"metadata":{"policyId":"38418","externalRealm":"exp-planner","externalRealmId":"1111070"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplayingliveroom","name":"upsell_card_enabled"},"metadata":{"policyId":"38428","externalRealm":"exp-planner","externalRealmId":"1111086"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-feature-performancesdkintegration","name":"should_instrument_page_performance"},"metadata":{"policyId":"39367","externalRealm":"exp-planner","externalRealmId":"1111836"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-localfiles","name":"documents_enabled"},"metadata":{"policyId":"40868","externalRealm":"exp-planner","externalRealmId":"1112863"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-metadata-feature","name":"track_auto_refresh_enabled"},"metadata":{"policyId":"40930","externalRealm":"exp-planner","externalRealmId":"1112887"},"boolValue":{}},{"propertyId":{"scope":"core-metadata-feature","name":"episode_auto_refresh_enabled"},"metadata":{"policyId":"40930","externalRealm":"exp-planner","externalRealmId":"1112887"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"auto_open_npv_for_video_podcasts"},"metadata":{"policyId":"41521","externalRealm":"exp-planner","externalRealmId":"1113304"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-eventsender","name":"request_compress_using"},"metadata":{"policyId":"42672","externalRealm":"exp-planner","externalRealmId":"1164048"},"enumValue":{"value":"gzip"}},{"propertyId":{"scope":"core-image","name":"enable_image_io_thread"},"metadata":{"policyId":"45439","externalRealm":"exp-planner","externalRealmId":"1115937"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"audio_index_should_send_report"},"metadata":{"policyId":"47578","externalRealm":"exp-planner","externalRealmId":"1181294"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"audio_index_job_period_seconds"},"metadata":{"policyId":"47578","externalRealm":"exp-planner","externalRealmId":"1181294"},"intValue":{"value":86413}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"audio_index_max_batch"},"metadata":{"policyId":"47578","externalRealm":"exp-planner","externalRealmId":"1181294"},"intValue":{"value":512}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"audio_index_job_delay_seconds"},"metadata":{"policyId":"47578","externalRealm":"exp-planner","externalRealmId":"1181294"},"intValue":{"value":31}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"audio_index_batch_period_seconds"},"metadata":{"policyId":"47578","externalRealm":"exp-planner","externalRealmId":"1181294"},"intValue":{"value":31}},{"propertyId":{"scope":"ios-feature-eventsender","name":"payload_size"},"metadata":{"policyId":"48858","externalRealm":"exp-planner","externalRealmId":"1269874"},"intValue":{"value":128000}},{"propertyId":{"scope":"ios-feature-lyrics","name":"enable_share_link_preview_uploads"},"metadata":{"policyId":"55040","externalRealm":"exp-planner","externalRealmId":"1121442"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-alexaaccountlinking","name":"account_linking_from_alexa_app"},"metadata":{"policyId":"59741","externalRealm":"exp-planner","externalRealmId":"1123847"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"video_data_saver_enabled"},"metadata":{"policyId":"59826","externalRealm":"exp-planner","externalRealmId":"1123869"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-datasaver","name":"enable_data_concerns_settings"},"metadata":{"policyId":"59826","externalRealm":"exp-planner","externalRealmId":"1123869"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_audiobook_gating_support"},"metadata":{"policyId":"60281","externalRealm":"exp-planner","externalRealmId":"1124159"},"enumValue":{"value":"Enabled"}},{"propertyId":{"scope":"core-offline","name":"update_all_interval_milliseconds"},"metadata":{"policyId":"61348","externalRealm":"exp-planner","externalRealmId":"1124689"},"intValue":{"value":200}},{"propertyId":{"scope":"core-offline","name":"metadata_wait_for_track_info_complete"},"metadata":{"policyId":"63956","externalRealm":"exp-planner","externalRealmId":"1126095"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"custom_abp_expiry_enabled"},"metadata":{"policyId":"65682","externalRealm":"exp-planner","externalRealmId":"1126953"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"smart_shuffle_show_sheet_count"},"metadata":{"policyId":"67684","externalRealm":"exp-planner","externalRealmId":"1143697"},"intValue":{"value":2}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"enable_smart_shuffle_lens_delay_factor"},"metadata":{"policyId":"67684","externalRealm":"exp-planner","externalRealmId":"1143697"},"intValue":{"value":5}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"signal_timeout"},"metadata":{"policyId":"67684","externalRealm":"exp-planner","externalRealmId":"1143697"},"intValue":{"value":5}},{"propertyId":{"scope":"core-playlist-feature","name":"playlist_context_updater_enabled"},"metadata":{"policyId":"67684","externalRealm":"exp-planner","externalRealmId":"1143697"},"enumValue":{"value":"WhenVolatileContextIsNotActive"}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"enable_smart_shuffle_lens_timeout"},"metadata":{"policyId":"67684","externalRealm":"exp-planner","externalRealmId":"1143697"},"intValue":{"value":10}},{"propertyId":{"scope":"ios-feature-reporting-menuaction","name":"enable_track_canvas_reporting"},"metadata":{"policyId":"70795","externalRealm":"exp-planner","externalRealmId":"1165616"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-reporting-menuaction","name":"enable_artist_profile_reporting"},"metadata":{"policyId":"70819","externalRealm":"exp-planner","externalRealmId":"1165615"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-podcast-interactivity-components","name":"enable_podcast_poll_reporting"},"metadata":{"policyId":"70839","externalRealm":"exp-planner","externalRealmId":"1165614"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-storage","name":"expiry_unlock_grace_music"},"metadata":{"policyId":"71158","externalRealm":"exp-planner","externalRealmId":"1129987"},"intValue":{"value":129600}},{"propertyId":{"scope":"ios-feature-hearables","name":"use_quickstart_pivot_for_tap"},"metadata":{"policyId":"72551","externalRealm":"exp-planner","externalRealmId":"1171010"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-hearables","name":"recommendation_instead_of_resume"},"metadata":{"policyId":"72565","externalRealm":"exp-planner","externalRealmId":"1130686"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-hearables","name":"spotify_tap_backend_service_enabled"},"metadata":{"policyId":"72567","externalRealm":"exp-planner","externalRealmId":"1130688"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-download","name":"fetch_full_internal_audio_show_episode"},"metadata":{"policyId":"73834","externalRealm":"exp-planner","externalRealmId":"1131433"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-podcast-ads","name":"fetch_cold_start_preroll_ad"},"metadata":{"policyId":"74820","externalRealm":"exp-planner","externalRealmId":"1162495"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-podcast-ads-feature","name":"enable_podcast_inter_episode_cold_start_preroll"},"metadata":{"policyId":"74820","externalRealm":"exp-planner","externalRealmId":"1162495"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-podcast-ads-feature","name":"metadata_blocking_duration"},"metadata":{"policyId":"74820","externalRealm":"exp-planner","externalRealmId":"1162495"},"intValue":{"value":700}},{"propertyId":{"scope":"core-podcast-ads-feature","name":"podcast_preroll_ad_playback_blocking_duration"},"metadata":{"policyId":"74820","externalRealm":"exp-planner","externalRealmId":"1162495"},"intValue":{"value":750}},{"propertyId":{"scope":"ios-feature-sleeptimer","name":"enable_fade_out"},"metadata":{"policyId":"80953","externalRealm":"exp-planner","externalRealmId":"1134278"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-sociallisteningconnectentitylogic","name":"nearby_session_invitation_dismiss_sheet_interval"},"metadata":{"policyId":"85653","externalRealm":"exp-planner","externalRealmId":"1136361"},"intValue":{"value":300}},{"propertyId":{"scope":"ios-sociallistening-attachments-impl","name":"enable_group_session_attachment"},"metadata":{"policyId":"85653","externalRealm":"exp-planner","externalRealmId":"1136361"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-socialrecommendationsassistedcurationplugins","name":"social_recommendations_card_enabled"},"metadata":{"policyId":"85653","externalRealm":"exp-planner","externalRealmId":"1136361"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-connectui","name":"hide_social_listening_info_from_connect_npb"},"metadata":{"policyId":"85653","externalRealm":"exp-planner","externalRealmId":"1136361"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"offline2_max_backoff_delay_milliseconds"},"metadata":{"policyId":"87559","externalRealm":"exp-planner","externalRealmId":"1136698"},"intValue":{"value":512000}},{"propertyId":{"scope":"ios-feature-daylist-share","name":"feature_enabled"},"metadata":{"policyId":"91115","externalRealm":"exp-planner","externalRealmId":"1138195"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-videocoordinator","name":"subtitles_autogenerated_override_enabled"},"metadata":{"policyId":"91266","externalRealm":"exp-planner","externalRealmId":"1138278"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-video","name":"subtitles_enabled"},"metadata":{"policyId":"91275","externalRealm":"exp-planner","externalRealmId":"1138277"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-videocoordinator","name":"subtitles_enabled"},"metadata":{"policyId":"91275","externalRealm":"exp-planner","externalRealmId":"1138277"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-podcast-interactivity-components","name":"updated_interactivity_ui_enabled"},"metadata":{"policyId":"92108","externalRealm":"exp-planner","externalRealmId":"1138539"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-spotifyappprotocol","name":"content_programming_enabled"},"metadata":{"policyId":"94952","externalRealm":"exp-planner","externalRealmId":"1139516"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"update_all_batch_size"},"metadata":{"policyId":"97496","externalRealm":"exp-planner","externalRealmId":"1140515"},"intValue":{"value":750}},{"propertyId":{"scope":"ios-watchfeed-feature-impl","name":"stop_player_on_background_thread"},"metadata":{"policyId":"99760","externalRealm":"exp-planner","externalRealmId":"1178926"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-impl","name":"entrypoint_card_stop_player_on_background_thread"},"metadata":{"policyId":"99762","externalRealm":"exp-planner","externalRealmId":"1149102"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-nowplayingviewmerch","name":"npv_card_enabled"},"metadata":{"policyId":"99990","externalRealm":"exp-planner","externalRealmId":"1141514"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"scroll_background_dark_color"},"metadata":{"policyId":"99990","externalRealm":"exp-planner","externalRealmId":"1141514"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-context-track-exts","name":"enable_podcast_html_description"},"metadata":{"policyId":"99990","externalRealm":"exp-planner","externalRealmId":"1141514"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-alignedcuration","name":"curation_indicator_on_track_row_enabled"},"metadata":{"policyId":"101696","externalRealm":"exp-planner","externalRealmId":"1142224"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-video","name":"bitstream_caching_ttl"},"metadata":{"policyId":"106000","externalRealm":"exp-planner","externalRealmId":"1143831"},"intValue":{"value":604800}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"should_load_on_background_thread"},"metadata":{"policyId":"106002","externalRealm":"exp-planner","externalRealmId":"1143833"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-episodechapters","name":"now_playing_chapter_card_enabled"},"metadata":{"policyId":"106044","externalRealm":"exp-planner","externalRealmId":"1143857"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"preferred_forward_buffer_duration"},"metadata":{"policyId":"106068","externalRealm":"exp-planner","externalRealmId":"1143871"},"intValue":{"value":2}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"preferred_forward_buffer_duration_when_media_is_playing"},"metadata":{"policyId":"106068","externalRealm":"exp-planner","externalRealmId":"1143871"},"intValue":{"value":8}},{"propertyId":{"scope":"core-download","name":"internal_request_size_data_kb"},"metadata":{"policyId":"107707","externalRealm":"exp-planner","externalRealmId":"1144448"},"intValue":{"value":3072}},{"propertyId":{"scope":"core-download","name":"internal_request_size_type"},"metadata":{"policyId":"107707","externalRealm":"exp-planner","externalRealmId":"1144448"},"enumValue":{"value":"Data"}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"negative_player_positions_when_seek_backward"},"metadata":{"policyId":"115470","externalRealm":"exp-planner","externalRealmId":"1148051"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lyrics","name":"enable_lyrics"},"metadata":{"policyId":"115475","externalRealm":"exp-planner","externalRealmId":"1148052"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-accessorymanager","name":"use_cached_categorizer"},"metadata":{"policyId":"116407","externalRealm":"exp-planner","externalRealmId":"1148491"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-ontour","name":"enable_nowplaying_scroll_events_card"},"metadata":{"policyId":"116712","externalRealm":"exp-planner","externalRealmId":"1148984"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-ontour","name":"nowplaying_scroll_response_cache_enabled"},"metadata":{"policyId":"116712","externalRealm":"exp-planner","externalRealmId":"1148984"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"sonos_minimum_ms_to_abort_by_transfer_to_same_device"},"metadata":{"policyId":"118861","externalRealm":"exp-planner","externalRealmId":"1151140"},"intValue":{"value":15000}},{"propertyId":{"scope":"ios-feature-freetierartist","name":"disable_blocked_content_for_gen_alpha"},"metadata":{"policyId":"121964","externalRealm":"exp-planner","externalRealmId":"1166232"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"third_party_playlist_support"},"metadata":{"policyId":"122978","externalRealm":"exp-planner","externalRealmId":"1153338"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lyrics","name":"enable_fb_messenger"},"metadata":{"policyId":"125069","externalRealm":"exp-planner","externalRealmId":"1154201"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lyrics","name":"enable_all_destinations"},"metadata":{"policyId":"125069","externalRealm":"exp-planner","externalRealmId":"1154201"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"share_enabled"},"metadata":{"policyId":"128133","externalRealm":"exp-planner","externalRealmId":"1155396"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-context-track-exts","name":"enable_transcripts"},"metadata":{"policyId":"133659","externalRealm":"exp-planner","externalRealmId":"1157868"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"detect_and_resolve_smart_linear"},"metadata":{"policyId":"134174","externalRealm":"exp-planner","externalRealmId":"1225332"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-freetierplaylist","name":"decrease_pl_data_loader_update_interval_enabled"},"metadata":{"policyId":"134424","externalRealm":"exp-planner","externalRealmId":"1232175"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-rc-observable-aa-test","name":"non_observable_property"},"metadata":{"policyId":"136104","externalRealm":"exp-planner","externalRealmId":"1158385"},"enumValue":{"value":"Blue"}},{"propertyId":{"scope":"ios-feature-phone-number-signup","name":"enable_alternative_code_verification_channel"},"metadata":{"policyId":"138243","externalRealm":"exp-planner","externalRealmId":"1175851"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-eventsender","name":"heartbeat_interval"},"metadata":{"policyId":"149003","externalRealm":"exp-planner","externalRealmId":"1164045"},"intValue":{"value":300}},{"propertyId":{"scope":"ios-feature-eventsender","name":"heartbeat_retry_interval"},"metadata":{"policyId":"149003","externalRealm":"exp-planner","externalRealmId":"1164045"},"intValue":{"value":30}},{"propertyId":{"scope":"ios-feature-share-menu","name":"is_snapchat_lens_enabled"},"metadata":{"policyId":"149875","externalRealm":"exp-planner","externalRealmId":"1163531"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_audiobook_navigation_node"},"metadata":{"policyId":"150602","externalRealm":"exp-planner","externalRealmId":"1163819"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-eventsender","name":"network_request_timeout"},"metadata":{"policyId":"151274","externalRealm":"exp-planner","externalRealmId":"1164047"},"intValue":{"value":30}},{"propertyId":{"scope":"ios-feature-eventsender","name":"send_events_on_bcd_event"},"metadata":{"policyId":"151276","externalRealm":"exp-planner","externalRealmId":"1164046"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share-menu","name":"is_sticker_width_backend_driven"},"metadata":{"policyId":"153109","externalRealm":"exp-planner","externalRealmId":"1165013"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-shareplay","name":"is_shareplay_enabled"},"metadata":{"policyId":"155015","externalRealm":"exp-planner","externalRealmId":"1165678"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_licensor_content_filtering"},"metadata":{"policyId":"156348","externalRealm":"exp-planner","externalRealmId":"1166233"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-externalintegration","name":"enable_content_filtering"},"metadata":{"policyId":"156348","externalRealm":"exp-planner","externalRealmId":"1166233"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"metadata_refresh_interval_seconds"},"metadata":{"policyId":"157532","externalRealm":"exp-planner","externalRealmId":"1166491"},"intValue":{"value":3600}},{"propertyId":{"scope":"ios-feature-shareplay","name":"is_shareplay_enabled_on_cars"},"metadata":{"policyId":"165396","externalRealm":"exp-planner","externalRealmId":"1169016"},"boolValue":{}},{"propertyId":{"scope":"ios-sociallistening-localnetworkbroadcasting","name":"enable_broadcasting"},"metadata":{"policyId":"165408","externalRealm":"exp-planner","externalRealmId":"1169021"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"enabled_courses_postfix_on_podcast_filter"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"course_page_enabled"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"materials_tab_hidden"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{}},{"propertyId":{"scope":"ios-learning-courseupsellpage-impl","name":"course_upsell_endpoints_web_host"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"enumValue":{"value":"production"}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"course_info_card_materials_row_hidden"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"is_watch_feed_entity_explorer_hidden"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"is_play_button_locked_badge_hidden"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{}},{"propertyId":{"scope":"core-context-track-exts","name":"enable_lesson_specifics"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"is_header_price_hidden"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"course_loadable_endpoints_web_host"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"enumValue":{"value":"production"}},{"propertyId":{"scope":"ios-feature-podcastepisode","name":"enable_lesson_episode_routing"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-learning-courseupsellpresenter-impl","name":"upsell_presenter_enabled"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-feature-podcast","name":"is_course_specifics_extension_enabled"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-podcastuiplatform-podcastcontextmenu-impl","name":"is_lesson_specifics_extension_enabled"},"metadata":{"policyId":"166577","externalRealm":"exp-planner","externalRealmId":"1260910"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-home-performanceinstrumentation-impl","name":"enable_subfeed_instrumentation"},"metadata":{"policyId":"168583","externalRealm":"exp-planner","externalRealmId":"1170178"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-playback-platform","name":"enable_local_fetchers"},"metadata":{"policyId":"169003","externalRealm":"exp-planner","externalRealmId":"1171533"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-playback-platform","name":"enable"},"metadata":{"policyId":"169003","externalRealm":"exp-planner","externalRealmId":"1171533"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-quickstart-pivot","name":"quickstart_uri_supported"},"metadata":{"policyId":"170715","externalRealm":"exp-planner","externalRealmId":"1213135"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-cardetection-jumpstarttrigger-impl","name":"trigger_enabled"},"metadata":{"policyId":"171490","externalRealm":"exp-planner","externalRealmId":"1171371"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-navigation","name":"default_list_fallback"},"metadata":{"policyId":"173776","externalRealm":"exp-planner","externalRealmId":"1172273"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-notificationsv2","name":"nen_opt_in_position"},"metadata":{"policyId":"174235","externalRealm":"exp-planner","externalRealmId":"1212491"},"intValue":{"value":2}},{"propertyId":{"scope":"ios-feature-freetiertrack","name":"music_videos_enabled"},"metadata":{"policyId":"176240","externalRealm":"exp-planner","externalRealmId":"1173139"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-context-track-exts","name":"enable_audio_associations"},"metadata":{"policyId":"176240","externalRealm":"exp-planner","externalRealmId":"1173139"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-context-track-exts","name":"enable_video_associations"},"metadata":{"policyId":"176240","externalRealm":"exp-planner","externalRealmId":"1173139"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-inlineintegrations","name":"ios_track_integration_enabled"},"metadata":{"policyId":"183407","externalRealm":"exp-planner","externalRealmId":"1198343"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-inlineintegrations","name":"ios_liked_songs_integration_enabled"},"metadata":{"policyId":"183407","externalRealm":"exp-planner","externalRealmId":"1198343"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-inlineintegrations","name":"ios_artist_integration_enabled"},"metadata":{"policyId":"183407","externalRealm":"exp-planner","externalRealmId":"1198343"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-clientmessagingplatform","name":"playlist_integration_enabled"},"metadata":{"policyId":"183407","externalRealm":"exp-planner","externalRealmId":"1198343"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-inlineintegrations","name":"ios_your_library_integration_enabled"},"metadata":{"policyId":"183407","externalRealm":"exp-planner","externalRealmId":"1198343"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-clientmessagingplatform","name":"album_integration_enabled"},"metadata":{"policyId":"183407","externalRealm":"exp-planner","externalRealmId":"1198343"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-account-common","name":"open_new_available_plans_page"},"metadata":{"policyId":"184034","externalRealm":"exp-planner","externalRealmId":"1175929"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-available-plans-page","name":"is_page_enabled"},"metadata":{"policyId":"184034","externalRealm":"exp-planner","externalRealmId":"1175929"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"offline_extracted_color"},"metadata":{"policyId":"184134","externalRealm":"exp-planner","externalRealmId":"1175966"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-context-track-color","name":"enable_context_track_color"},"metadata":{"policyId":"184134","externalRealm":"exp-planner","externalRealmId":"1175966"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"avoid_mode_resolver_logic_when_track_nil"},"metadata":{"policyId":"186754","externalRealm":"exp-planner","externalRealmId":"1177002"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-bluetooth-logger-impl","name":"bluetooth_logger_enabled"},"metadata":{"policyId":"187359","externalRealm":"exp-planner","externalRealmId":"1177185"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"jam_queue_button_enabled"},"metadata":{"policyId":"191457","externalRealm":"exp-planner","externalRealmId":"1178685"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-login","name":"facebook_limited_login_enabled"},"metadata":{"policyId":"193788","externalRealm":"exp-planner","externalRealmId":"1179374"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-prerelease-nowplayingviewprovider-impl","name":"is_enabled"},"metadata":{"policyId":"196145","externalRealm":"exp-planner","externalRealmId":"1180167"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-artist-releases-impl","name":"artist_releases_list_content_runtime_page_enabled"},"metadata":{"policyId":"198139","externalRealm":"exp-planner","externalRealmId":"1180786"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-ontour","name":"enable_nowplaying_scroll_events_card_on_ipad"},"metadata":{"policyId":"201591","externalRealm":"exp-planner","externalRealmId":"1182044"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-embeddedctacards","name":"should_enable_scalable_layout"},"metadata":{"policyId":"201591","externalRealm":"exp-planner","externalRealmId":"1182044"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"should_enable_scalable_layout_on_npv_entity"},"metadata":{"policyId":"201591","externalRealm":"exp-planner","externalRealmId":"1182044"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-podcastpolls","name":"is_enabled_for_npv_on_ipad"},"metadata":{"policyId":"201591","externalRealm":"exp-planner","externalRealmId":"1182044"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-share-podcast-sharing","name":"is_transcripts_suggestions_for_timestamp_enabled"},"metadata":{"policyId":"202073","externalRealm":"exp-planner","externalRealmId":"1182197"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-excerpts","name":"excerpts_enabled"},"metadata":{"policyId":"202073","externalRealm":"exp-planner","externalRealmId":"1182197"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-highlightsstats","name":"sharing_enabled"},"metadata":{"policyId":"204702","externalRealm":"exp-planner","externalRealmId":"1183682"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-bluetooth-scanning-impl","name":"bluetooth_scanning_timeout"},"metadata":{"policyId":"205277","externalRealm":"exp-planner","externalRealmId":"1183203"},"intValue":{"value":1200}},{"propertyId":{"scope":"ios-short-link-branch","name":"branch_logging_level"},"metadata":{"policyId":"205988","externalRealm":"exp-planner","externalRealmId":"1183459"},"enumValue":{"value":"error"}},{"propertyId":{"scope":"ios-feature-sociallisteninginvitationflow","name":"enable_social_radar_onboarding"},"metadata":{"policyId":"206026","externalRealm":"exp-planner","externalRealmId":"1183480"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-sociallistening-localnetworksessionfinder","name":"enable_discovery_v2"},"metadata":{"policyId":"206783","externalRealm":"exp-planner","externalRealmId":"1183725"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-podcastuiplatform-episodedescriptioncard-impl","name":"show_episode_description_card"},"metadata":{"policyId":"208997","externalRealm":"exp-planner","externalRealmId":"1184480"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-device-predictability","name":"recommendation_nudge_delay"},"metadata":{"policyId":"209881","externalRealm":"exp-planner","externalRealmId":"1223217"},"intValue":{"value":500}},{"propertyId":{"scope":"ios-feature-allboarding","name":"skip_allboarding_for_auth"},"metadata":{"policyId":"210375","externalRealm":"exp-planner","externalRealmId":"1184910"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplayingbar","name":"data_saver_tooltip"},"metadata":{"policyId":"212033","externalRealm":"exp-planner","externalRealmId":"1185568"},"boolValue":{}},{"propertyId":{"scope":"core-content-formats-feature","name":"list_platform_request_timeout_seconds"},"metadata":{"policyId":"220820","externalRealm":"exp-planner","externalRealmId":"1188322"},"intValue":{"value":40}},{"propertyId":{"scope":"ios-watchfeed-feature-impl","name":"update_focused_item_index_while_scrolling"},"metadata":{"policyId":"222438","externalRealm":"exp-planner","externalRealmId":"1188965"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"opc_refresh_enabled"},"metadata":{"policyId":"223660","externalRealm":"exp-planner","externalRealmId":"1189361"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-offline-error-impl","name":"enable_offline_listening_device_limit_text"},"metadata":{"policyId":"223660","externalRealm":"exp-planner","externalRealmId":"1189361"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"offline_playable_cache"},"metadata":{"policyId":"223660","externalRealm":"exp-planner","externalRealmId":"1189361"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"send_opc_report"},"metadata":{"policyId":"223660","externalRealm":"exp-planner","externalRealmId":"1189361"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"offline_playable_cache_num_keys_required"},"metadata":{"policyId":"223660","externalRealm":"exp-planner","externalRealmId":"1189361"},"intValue":{"value":3}},{"propertyId":{"scope":"core-offline","name":"offline_playable_cache_allow_default"},"metadata":{"policyId":"223660","externalRealm":"exp-planner","externalRealmId":"1189361"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-settings","name":"enable_offline_listening_toggle"},"metadata":{"policyId":"223660","externalRealm":"exp-planner","externalRealmId":"1189361"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-pending-events","name":"stats_interval_seconds"},"metadata":{"policyId":"225074","externalRealm":"exp-planner","externalRealmId":"1189843"},"intValue":{"value":300}},{"propertyId":{"scope":"core-pending-events","name":"send_pes_as_metrics_snapshot"},"metadata":{"policyId":"225074","externalRealm":"exp-planner","externalRealmId":"1189843"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-pending-events","name":"stats_enable"},"metadata":{"policyId":"225074","externalRealm":"exp-planner","externalRealmId":"1189843"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-pending-events","name":"use_event_sender_persistence_completion"},"metadata":{"policyId":"225079","externalRealm":"exp-planner","externalRealmId":"1189844"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-eventsender","name":"send_events_when_going_to_background"},"metadata":{"policyId":"225081","externalRealm":"exp-planner","externalRealmId":"1189861"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-eventsender","name":"send_events_in_bg_task"},"metadata":{"policyId":"225081","externalRealm":"exp-planner","externalRealmId":"1189861"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibrarypodcast","name":"new_episodes_wait_for_both_sections_to_load"},"metadata":{"policyId":"239073","externalRealm":"exp-planner","externalRealmId":"1193988"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline-playable-cache-esperanto-feature","name":"opc_ap_max_iterations"},"metadata":{"policyId":"240368","externalRealm":"exp-planner","externalRealmId":"1194313"},"intValue":{"value":60}},{"propertyId":{"scope":"ios-feature-freetierartist","name":"override_default_artist_playback_to_linear_enabled"},"metadata":{"policyId":"244522","externalRealm":"exp-planner","externalRealmId":"1195640"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-freetierartist","name":"double_state_resume_enabled"},"metadata":{"policyId":"244522","externalRealm":"exp-planner","externalRealmId":"1195640"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-contextualshuffle","name":"is_enabled"},"metadata":{"policyId":"244522","externalRealm":"exp-planner","externalRealmId":"1195640"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-contextualshuffle","name":"shuffle_storage_kind"},"metadata":{"policyId":"244522","externalRealm":"exp-planner","externalRealmId":"1195640"},"enumValue":{"value":"LocalSettings"}},{"propertyId":{"scope":"ios-feature-encoreexperiments","name":"reduced_play_button_tappable_area_enabled"},"metadata":{"policyId":"244522","externalRealm":"exp-planner","externalRealmId":"1195640"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-eventsender","name":"optimize_ess"},"metadata":{"policyId":"245440","externalRealm":"exp-planner","externalRealmId":"1195955"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-content-formats-feature","name":"core_update_pub_date_index_on_list_update"},"metadata":{"policyId":"250436","externalRealm":"exp-planner","externalRealmId":"1202820"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-content-formats-feature","name":"list_platform_episode_loader_throttling_milliseconds"},"metadata":{"policyId":"250436","externalRealm":"exp-planner","externalRealmId":"1202820"},"intValue":{}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"fetch_missing_images"},"metadata":{"policyId":"251275","externalRealm":"exp-planner","externalRealmId":"1197927"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"fetch_missing_track_descriptors"},"metadata":{"policyId":"251275","externalRealm":"exp-planner","externalRealmId":"1197927"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-blendinvitation","name":"euterpe_menu_option_position"},"metadata":{"policyId":"252960","externalRealm":"exp-planner","externalRealmId":"1264987"},"intValue":{"value":1}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"enable_euterpe_tooltip"},"metadata":{"policyId":"252960","externalRealm":"exp-planner","externalRealmId":"1264987"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-partneraiassistant-metawearables","name":"enable_integration"},"metadata":{"policyId":"254122","externalRealm":"exp-planner","externalRealmId":"1198849"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-bluetoothacquisition","name":"onboarding_elegible_device_types"},"metadata":{"policyId":"259615","externalRealm":"exp-planner","externalRealmId":"1200563"},"enumValue":{"value":"speaker_and_car"}},{"propertyId":{"scope":"ios-feature-bluetoothacquisition","name":"is_bluetooth_acquisition_enabled"},"metadata":{"policyId":"259615","externalRealm":"exp-planner","externalRealmId":"1200563"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-alignedcuration","name":"curation_for_external_integrations_enabled"},"metadata":{"policyId":"260232","externalRealm":"exp-planner","externalRealmId":"1200784"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-playlistcreation","name":"euterpe_onboarding_screen_enabled"},"metadata":{"policyId":"262231","externalRealm":"exp-planner","externalRealmId":"1201496"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-listuxplatformconsumers-curatecontextplugin","name":"max_playlist_size"},"metadata":{"policyId":"265437","externalRealm":"exp-planner","externalRealmId":"1202470"},"intValue":{"value":2000}},{"propertyId":{"scope":"ios-artistabout-artistaboutcard-impl","name":"is_affinity_heuristic_enabled"},"metadata":{"policyId":"267231","externalRealm":"exp-planner","externalRealmId":"1203045"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-artistabout-artistaboutcard-impl","name":"is_following_heuristic_enabled"},"metadata":{"policyId":"267231","externalRealm":"exp-planner","externalRealmId":"1203045"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-settings-platform","name":"is_privacy_and_social_page_enabled"},"metadata":{"policyId":"267375","externalRealm":"exp-planner","externalRealmId":"1203090"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-podcast-ads-feature","name":"disable_ads_for_audiobook_chapters"},"metadata":{"policyId":"269430","externalRealm":"exp-planner","externalRealmId":"1203696"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-ads","name":"lasertag_experiment_dummy"},"metadata":{"policyId":"273692","externalRealm":"exp-planner","externalRealmId":"1204931"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-watchplatform","name":"player_state_application_context_updates_enabled"},"metadata":{"policyId":"274961","externalRealm":"exp-planner","externalRealmId":"1205456"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-settings-platform","name":"is_content_personalization_page_enabled"},"metadata":{"policyId":"279391","externalRealm":"exp-planner","externalRealmId":"1206801"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-playlistcreation","name":"custom_resolver_enabled"},"metadata":{"policyId":"280759","externalRealm":"exp-planner","externalRealmId":"1212634"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"attack_on_titan_easter_egg_enabled"},"metadata":{"policyId":"282347","externalRealm":"exp-planner","externalRealmId":"1207938"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-gatedcontent","name":"gated_entity_extension_enabled"},"metadata":{"policyId":"283313","externalRealm":"exp-planner","externalRealmId":"1208275"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-gatedcontent","name":"gated_content_badge_episode_header_enabled"},"metadata":{"policyId":"283313","externalRealm":"exp-planner","externalRealmId":"1208275"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-gatedcontent","name":"gated_content_badge_playlist_row_enabled"},"metadata":{"policyId":"283313","externalRealm":"exp-planner","externalRealmId":"1208275"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-gatedcontent","name":"npv_scroll_card_enabled"},"metadata":{"policyId":"283313","externalRealm":"exp-planner","externalRealmId":"1208275"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-gatedcontent","name":"gated_content_banner_episode_enabled"},"metadata":{"policyId":"283313","externalRealm":"exp-planner","externalRealmId":"1208275"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-collectiondataloader","name":"enable_gated_entity_extension_your_episode"},"metadata":{"policyId":"283313","externalRealm":"exp-planner","externalRealmId":"1208275"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-collectionplatformlegacy","name":"is_gated_entity_relations_enabled"},"metadata":{"policyId":"283314","externalRealm":"exp-planner","externalRealmId":"1208276"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-gatedcontent","name":"gated_content_banner_show_enabled"},"metadata":{"policyId":"283316","externalRealm":"exp-planner","externalRealmId":"1208278"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-podcastpolls","name":"should_show_polls_element_on_episode_page"},"metadata":{"policyId":"286859","externalRealm":"exp-planner","externalRealmId":"1209347"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-podcastpolls","name":"should_show_polls_element_on_npv"},"metadata":{"policyId":"286859","externalRealm":"exp-planner","externalRealmId":"1209347"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-djsettings-impl","name":"enable_language_selection"},"metadata":{"policyId":"286897","externalRealm":"exp-planner","externalRealmId":"1209356"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-feature-impl","name":"accessibility_playback_controls_enabled"},"metadata":{"policyId":"287406","externalRealm":"exp-planner","externalRealmId":"1212189"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"stale_response_policy"},"metadata":{"policyId":"290635","externalRealm":"exp-planner","externalRealmId":"1210758"},"enumValue":{"value":"stale_while_revalidate"}},{"propertyId":{"scope":"ios-share-destinationhandler-impl","name":"is_idaho_feed_enabled"},"metadata":{"policyId":"290738","externalRealm":"exp-planner","externalRealmId":"1210801"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-share-destinationhandler-impl","name":"is_idaho_messages_enabled"},"metadata":{"policyId":"290738","externalRealm":"exp-planner","externalRealmId":"1210801"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"adaptive_video_min_resolution_filter_enabled"},"metadata":{"policyId":"290748","externalRealm":"exp-planner","externalRealmId":"1210812"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"observe_cpp_system_audio_output"},"metadata":{"policyId":"291144","externalRealm":"exp-planner","externalRealmId":"1210973"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-bluetoothacquisition","name":"enable_ask_permission_when_user_join_as_participant"},"metadata":{"policyId":"291822","externalRealm":"exp-planner","externalRealmId":"1211181"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-feature-impl","name":"long_press_to_hide_overlays_gesture_enabled"},"metadata":{"policyId":"293071","externalRealm":"exp-planner","externalRealmId":"1223599"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-feature-impl","name":"double_tap_to_like_gesture_enabled"},"metadata":{"policyId":"293071","externalRealm":"exp-planner","externalRealmId":"1223599"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-voting","name":"should_navigate_to_share_page"},"metadata":{"policyId":"294272","externalRealm":"exp-planner","externalRealmId":"1212049"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-time-stretcher-advanced-feature","name":"time_stretcher_engine"},"metadata":{"policyId":"298491","externalRealm":"exp-planner","externalRealmId":"1213630"},"enumValue":{"value":"Finer"}},{"propertyId":{"scope":"ios-feature-search","name":"video_metadata_episodes_enabled"},"metadata":{"policyId":"300295","externalRealm":"exp-planner","externalRealmId":"1214460"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-embeddedctacards","name":"music_npv_leavebehinds_enabled"},"metadata":{"policyId":"300976","externalRealm":"exp-planner","externalRealmId":"1214654"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-sociallistening-joingroupsession-impl","name":"is_profile_completion_sheet_enabled"},"metadata":{"policyId":"301533","externalRealm":"exp-planner","externalRealmId":"1214849"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"block_installations_to_lg_tvs_with_dash"},"metadata":{"policyId":"302480","externalRealm":"exp-planner","externalRealmId":"1215193"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-settings-platform","name":"is_apps_and_devices_page_enabled"},"metadata":{"policyId":"304019","externalRealm":"exp-planner","externalRealmId":"1215897"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-remoteconfiguration-bootstrap-impl","name":"login_trials_enabled"},"metadata":{"policyId":"306423","externalRealm":"exp-planner","externalRealmId":"1216800"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-ondemandtrial","name":"enable_call_trials_facade"},"metadata":{"policyId":"306423","externalRealm":"exp-planner","externalRealmId":"1216800"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-liveaudio-livestreampage","name":"add_to_calendar_enabled"},"metadata":{"policyId":"309705","externalRealm":"exp-planner","externalRealmId":"1218051"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-campaigns","name":"wrapped_routing_destination"},"metadata":{"policyId":"311529","externalRealm":"exp-planner","externalRealmId":"1270150"},"enumValue":{"value":"wrapped_native"}},{"propertyId":{"scope":"ios-feature-nowplaying-modes","name":"duration_elements_unit"},"metadata":{"policyId":"315336","externalRealm":"exp-planner","externalRealmId":"1219485"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-settings-platform","name":"is_account_page_enabled"},"metadata":{"policyId":"315933","externalRealm":"exp-planner","externalRealmId":"1219680"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_client_side_show_resume_episode"},"metadata":{"policyId":"320139","externalRealm":"exp-planner","externalRealmId":"1221022"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-show-cosmos","name":"show_request_use_resumption_progress"},"metadata":{"policyId":"322022","externalRealm":"exp-planner","externalRealmId":"1221566"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"audiobook_progress_enabled"},"metadata":{"policyId":"323223","externalRealm":"exp-planner","externalRealmId":"1222033"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-prefetch-feature","name":"media_prefetcher_cache_error_disable_seconds"},"metadata":{"policyId":"325573","externalRealm":"exp-planner","externalRealmId":"1222834"},"intValue":{"value":300}},{"propertyId":{"scope":"core-common-capping","name":"init_retry_amount"},"metadata":{"policyId":"325718","externalRealm":"exp-planner","externalRealmId":"1222861"},"intValue":{"value":13}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"bottom_sheet_queue_enabled"},"metadata":{"policyId":"328481","externalRealm":"exp-planner","externalRealmId":"1223836"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-companioncontent","name":"npv_scroll_card_enabled"},"metadata":{"policyId":"332775","externalRealm":"exp-planner","externalRealmId":"1224900"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-companioncontent","name":"npv_card_autoscroll_enabled"},"metadata":{"policyId":"332775","externalRealm":"exp-planner","externalRealmId":"1224900"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-readalong","name":"can_hide_controls_enabled"},"metadata":{"policyId":"332775","externalRealm":"exp-planner","externalRealmId":"1224900"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-companioncontent","name":"npv_scroll_card_audiobooks_enabled"},"metadata":{"policyId":"332775","externalRealm":"exp-planner","externalRealmId":"1224900"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-companioncontent","name":"audiobook_tabs_enabled"},"metadata":{"policyId":"332775","externalRealm":"exp-planner","externalRealmId":"1224900"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-smartshuffle-npvscrollrecscard-impl","name":"enable_keep_previous_recommendations_in_same_position_whenever_possible"},"metadata":{"policyId":"336547","externalRealm":"exp-planner","externalRealmId":"1226008"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-smartshuffle-npvscrollrecscard-impl","name":"npv_scroll_card_enabled"},"metadata":{"policyId":"336547","externalRealm":"exp-planner","externalRealmId":"1226008"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_play_history_shuffle_scorer"},"metadata":{"policyId":"336894","externalRealm":"exp-planner","externalRealmId":"1226077"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-listuxplatformconsumers-curatecontextplugin","name":"enable_chip_view"},"metadata":{"policyId":"340530","externalRealm":"exp-planner","externalRealmId":"1227294"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-freetierplaylist","name":"enable_artwork_tap_to_edit"},"metadata":{"policyId":"340952","externalRealm":"exp-planner","externalRealmId":"1227370"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-usergeneratedcoverart","name":"entry_point_in_edit_playlist_enabled"},"metadata":{"policyId":"340952","externalRealm":"exp-planner","externalRealmId":"1227370"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-usergeneratedcoverart","name":"enabled"},"metadata":{"policyId":"340952","externalRealm":"exp-planner","externalRealmId":"1227370"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-usergeneratedcoverart","name":"navigate_to_edit_playlist_cover_art_page"},"metadata":{"policyId":"340952","externalRealm":"exp-planner","externalRealmId":"1227370"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-account-switching-ui","name":"is_add_account_page_enabled"},"metadata":{"policyId":"341388","externalRealm":"exp-planner","externalRealmId":"1227483"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"audiobooks_common_capping_stopping_node"},"metadata":{"policyId":"342162","externalRealm":"exp-planner","externalRealmId":"1227725"},"enumValue":{"value":"Enabled"}},{"propertyId":{"scope":"ios-feature-audiobook-capping","name":"should_stop_player_when_capped"},"metadata":{"policyId":"342162","externalRealm":"exp-planner","externalRealmId":"1227725"},"boolValue":{}},{"propertyId":{"scope":"core-audiobook-sequence-provider-feature","name":"enable_audio_capping_notification"},"metadata":{"policyId":"342162","externalRealm":"exp-planner","externalRealmId":"1227725"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_sequence_player_routing"},"metadata":{"policyId":"342162","externalRealm":"exp-planner","externalRealmId":"1227725"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_do_not_publish_trackless_intermediate_states"},"metadata":{"policyId":"342162","externalRealm":"exp-planner","externalRealmId":"1227725"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_reset_track_sequence_on_advance_and_skip_for_sequence_player_tracks"},"metadata":{"policyId":"342162","externalRealm":"exp-planner","externalRealmId":"1227725"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"audiobook_finished_filter_enabled"},"metadata":{"policyId":"343178","externalRealm":"exp-planner","externalRealmId":"1228036"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"audiobook_finished_icon_enabled"},"metadata":{"policyId":"343178","externalRealm":"exp-planner","externalRealmId":"1228036"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-bluetoothacquisition","name":"minimum_account_active_days"},"metadata":{"policyId":"345010","externalRealm":"exp-planner","externalRealmId":"1228581"},"intValue":{"value":21}},{"propertyId":{"scope":"ios-feature-freetierplaylist","name":"liked_songs_static_metadata_enabled"},"metadata":{"policyId":"345143","externalRealm":"exp-planner","externalRealmId":"1228626"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"lg_wol_minimum_ms_to_abort_by_transfer_to_same_device"},"metadata":{"policyId":"345880","externalRealm":"exp-planner","externalRealmId":"1228869"},"intValue":{"value":30000}},{"propertyId":{"scope":"core-connect-feature","name":"player_state_changed_putstate_throttling_window"},"metadata":{"policyId":"346048","externalRealm":"exp-planner","externalRealmId":"1228921"},"intValue":{"value":50}},{"propertyId":{"scope":"core-connect-feature","name":"samsung_wol_minimum_ms_to_abort_by_transfer_to_same_device"},"metadata":{"policyId":"346750","externalRealm":"exp-planner","externalRealmId":"1229255"},"intValue":{"value":20000}},{"propertyId":{"scope":"ios-feature-premiumdestination","name":"premium_destination_hubsless"},"metadata":{"policyId":"346954","externalRealm":"exp-planner","externalRealmId":"1229396"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"command_rate_limiter_window"},"metadata":{"policyId":"348026","externalRealm":"exp-planner","externalRealmId":"1229710"},"intValue":{"value":60000}},{"propertyId":{"scope":"core-connect-feature","name":"max_allowed_commands_per_window"},"metadata":{"policyId":"348026","externalRealm":"exp-planner","externalRealmId":"1229710"},"intValue":{"value":60}},{"propertyId":{"scope":"ios-account-switching-ui","name":"is_draweritem_enabled"},"metadata":{"policyId":"348042","externalRealm":"exp-planner","externalRealmId":"1229712"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-account-switching","name":"max_accounts"},"metadata":{"policyId":"348042","externalRealm":"exp-planner","externalRealmId":"1229712"},"intValue":{"value":10}},{"propertyId":{"scope":"ios-account-switching","name":"is_enabled"},"metadata":{"policyId":"348042","externalRealm":"exp-planner","externalRealmId":"1229712"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_hide_sensitive_comments"},"metadata":{"policyId":"348181","externalRealm":"exp-planner","externalRealmId":"1229751"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-collectionplatformlegacy","name":"hide_in_context_enabled"},"metadata":{"policyId":"348420","externalRealm":"exp-planner","externalRealmId":"1229873"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-npvprovider","name":"watch_feed_in_npv_enabled"},"metadata":{"policyId":"350275","externalRealm":"exp-planner","externalRealmId":"1230437"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-npvprovider","name":"watch_feed_in_npv_enabled_on_ipad"},"metadata":{"policyId":"350275","externalRealm":"exp-planner","externalRealmId":"1230437"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_multi_reactions"},"metadata":{"policyId":"350345","externalRealm":"exp-planner","externalRealmId":"1230450"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline-playable-cache-esperanto-feature","name":"opc_deduplication_method"},"metadata":{"policyId":"351061","externalRealm":"exp-planner","externalRealmId":"1230609"},"enumValue":{"value":"CanonicalTrack"}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"cached_files_curation_enabled"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-offline-playablecache-impl","name":"max_number_of_tracks"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"intValue":{"value":350}},{"propertyId":{"scope":"ios-offline-playablecache-impl","name":"enabled"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"cached_files_enabled"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-offline-playablecache-impl","name":"enable_smart_sorting"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-offline-playablecache-impl","name":"home_entry_point"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"enumValue":{"value":"promo"}},{"propertyId":{"scope":"ios-offline-playablecache-impl","name":"enable_remove_track_context_menu_action"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline-playable-cache-feature","name":"return_ongoing_status"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-offline-playablecache-impl","name":"home_entry_point_minimum_number_of_tracks"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"intValue":{"value":5}},{"propertyId":{"scope":"ios-offline-playablecache-impl","name":"min_number_of_tracks"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"intValue":{"value":5}},{"propertyId":{"scope":"ios-offline-playablecache-impl","name":"content_tag_filtering_max_tags"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"intValue":{"value":15}},{"propertyId":{"scope":"ios-offline-playablecache-impl","name":"enable_curation"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-alignedcuration","name":"offline_playable_cache_curation_enabled"},"metadata":{"policyId":"351067","externalRealm":"exp-planner","externalRealmId":"1230610"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourepisodes","name":"reordering_enabled"},"metadata":{"policyId":"353075","externalRealm":"exp-planner","externalRealmId":"1231245"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-bluetoothacquisition","name":"enable_settings_bluetooth_entry_point"},"metadata":{"policyId":"353837","externalRealm":"exp-planner","externalRealmId":"1231514"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-socialradarreceiver","name":"token_expiry_time_interval"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"intValue":{"value":10}},{"propertyId":{"scope":"ios-jam-socialradarsender","name":"sending_join_token_time_interval"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"intValue":{"value":5000}},{"propertyId":{"scope":"ios-feature-scanner","name":"is_social_radar_scanner_enabled"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-advertiser","name":"social_radar_v2_enabled"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-socialradarreceiver","name":"enable_receiving"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-scanner","name":"social_radar_close_threshold"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"intValue":{"value":400}},{"propertyId":{"scope":"ios-feature-sociallisteningconnectentitylogic","name":"nearby_session_dismiss_invite_when_session_disappears"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-socialradarsender","name":"sending_enabled"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-sociallisteningconnectentitylogic","name":"show_nearby_jam_nudge"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-sociallisteningconnectentitylogic","name":"nearby_jam_nudge_count"},"metadata":{"policyId":"360286","externalRealm":"exp-planner","externalRealmId":"1233670"},"intValue":{"value":5}},{"propertyId":{"scope":"ios-feature-screenshot-detection","name":"episode_screenshot_sharing_enabled"},"metadata":{"policyId":"360570","externalRealm":"exp-planner","externalRealmId":"1233762"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-settings-platform","name":"is_connectivity_page_enabled"},"metadata":{"policyId":"361755","externalRealm":"exp-planner","externalRealmId":"1234121"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lyrics","name":"enable_sharing_v2"},"metadata":{"policyId":"362779","externalRealm":"exp-planner","externalRealmId":"1234461"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"cast_minimum_ms_to_abort_by_transfer_to_same_device"},"metadata":{"policyId":"364962","externalRealm":"exp-planner","externalRealmId":"1235115"},"intValue":{"value":10000}},{"propertyId":{"scope":"core-connect-feature","name":"playstation_minimum_ms_to_abort_by_transfer_to_same_device"},"metadata":{"policyId":"364975","externalRealm":"exp-planner","externalRealmId":"1235128"},"intValue":{"value":15000}},{"propertyId":{"scope":"core-bitrate","name":"net_fortune_fetch_enabled"},"metadata":{"policyId":"367637","externalRealm":"exp-planner","externalRealmId":"1235945"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ads","name":"prevent_duplicate_ad_requests_for_slot"},"metadata":{"policyId":"369231","externalRealm":"exp-planner","externalRealmId":"1236406"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-addtoplaylist","name":"filter_textfield_treshold"},"metadata":{"policyId":"373462","externalRealm":"exp-planner","externalRealmId":"1237931"},"intValue":{"value":6}},{"propertyId":{"scope":"ios-feature-addtoplaylist","name":"sectioned_add_to_playlist_dialog_enabled"},"metadata":{"policyId":"373462","externalRealm":"exp-planner","externalRealmId":"1237931"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"split_sectioned_add_to_playlist_request_enabled"},"metadata":{"policyId":"373462","externalRealm":"exp-planner","externalRealmId":"1237931"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-addtoplaylist","name":"disable_add_to_playlist_pagination"},"metadata":{"policyId":"373462","externalRealm":"exp-planner","externalRealmId":"1237931"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-videorecommendations-npvprovider-impl","name":"filter_recent_videos_enabled"},"metadata":{"policyId":"374890","externalRealm":"exp-planner","externalRealmId":"1238288"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-audiobook-sequence-provider-feature","name":"enable_audiobooks_stopping_on_end"},"metadata":{"policyId":"375736","externalRealm":"exp-planner","externalRealmId":"1238559"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-liveevents-contextmenu","name":"enable_artist_concerts_context_menu"},"metadata":{"policyId":"375875","externalRealm":"exp-planner","externalRealmId":"1238601"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-ontour","name":"new_date_formatter_enabled"},"metadata":{"policyId":"375876","externalRealm":"exp-planner","externalRealmId":"1238602"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-short-link-branch","name":"is_using_branch_custom_api"},"metadata":{"policyId":"377376","externalRealm":"exp-planner","externalRealmId":"1239130"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-jam-platformimpl","name":"enable_connect_backend_sync"},"metadata":{"policyId":"381013","externalRealm":"exp-planner","externalRealmId":"1240299"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-freetierartist","name":"exclude_liked_releases_from_liked_songs"},"metadata":{"policyId":"382465","externalRealm":"exp-planner","externalRealmId":"1240885"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-videorecommendations-component-impl","name":"stream_reporting_enabled"},"metadata":{"policyId":"384477","externalRealm":"exp-planner","externalRealmId":"1241466"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-auto-add-accounts","name":"is_enabled"},"metadata":{"policyId":"386602","externalRealm":"exp-planner","externalRealmId":"1242135"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-collectionplatformlegacy","name":"x_hide_icon_enabled"},"metadata":{"policyId":"387725","externalRealm":"exp-planner","externalRealmId":"1242448"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"x_hide_icon_enabled"},"metadata":{"policyId":"387725","externalRealm":"exp-planner","externalRealmId":"1242448"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-elements","name":"x_hide_icon"},"metadata":{"policyId":"387725","externalRealm":"exp-planner","externalRealmId":"1242448"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-collection-feature","name":"fetch_id_trait_for_artists"},"metadata":{"policyId":"388694","externalRealm":"exp-planner","externalRealmId":"1242727"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-lockscreen-coldstart-impl","name":"enable_carplay_triggers"},"metadata":{"policyId":"389478","externalRealm":"exp-planner","externalRealmId":"1242928"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-premiumaccountmanagement","name":"pam_prefetch_account_subscription_status"},"metadata":{"policyId":"390344","externalRealm":"exp-planner","externalRealmId":"1243232"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-premiumaccountmanagement","name":"billing_row_enabled"},"metadata":{"policyId":"390344","externalRealm":"exp-planner","externalRealmId":"1243232"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-playlist","name":"enable_public_playlists_setting"},"metadata":{"policyId":"391470","externalRealm":"exp-planner","externalRealmId":"1243595"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-playlist","name":"enable_playlists_appear_on_your_profile_setting"},"metadata":{"policyId":"391470","externalRealm":"exp-planner","externalRealmId":"1243595"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourepisodes","name":"video_filter_enabled"},"metadata":{"policyId":"391528","externalRealm":"exp-planner","externalRealmId":"1243598"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lyrics","name":"is_twitter_enabled"},"metadata":{"policyId":"392764","externalRealm":"exp-planner","externalRealmId":"1243980"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-alignedcuration","name":"curation_for_videos_enabled"},"metadata":{"policyId":"392863","externalRealm":"exp-planner","externalRealmId":"1244001"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"smart_shuffle_allowed_setting_enabled"},"metadata":{"policyId":"396125","externalRealm":"exp-planner","externalRealmId":"1245213"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"disable_repeat_on_context_change_for_search_tracks_sticky"},"metadata":{"policyId":"396524","externalRealm":"exp-planner","externalRealmId":"1245320"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-prefetch-feature","name":"media_prefetcher_enabled"},"metadata":{"policyId":"397121","externalRealm":"exp-planner","externalRealmId":"1245544"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-prefetch-feature","name":"media_prefetcher_feature_ads_window_size"},"metadata":{"policyId":"397121","externalRealm":"exp-planner","externalRealmId":"1245544"},"intValue":{"value":4}},{"propertyId":{"scope":"ios-feature-remotedownloads-ui","name":"enable_remote_downloads"},"metadata":{"policyId":"398743","externalRealm":"exp-planner","externalRealmId":"1245955"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-remotedownloads-offline2","name":"enable_all_devices"},"metadata":{"policyId":"398743","externalRealm":"exp-planner","externalRealmId":"1245955"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-remotedownloads-offline2","name":"enable_manager"},"metadata":{"policyId":"398743","externalRealm":"exp-planner","externalRealmId":"1245955"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-connectflags","name":"enable_optimistic_volume_updates"},"metadata":{"policyId":"398920","externalRealm":"exp-planner","externalRealmId":"1246018"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"enable_lg_remote_installation"},"metadata":{"policyId":"399410","externalRealm":"exp-planner","externalRealmId":"1246122"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"install_over_connect_timeout"},"metadata":{"policyId":"399410","externalRealm":"exp-planner","externalRealmId":"1246122"},"intValue":{"value":180}},{"propertyId":{"scope":"ios-feature-connectui","name":"enable_app_install_dialogs_and_states"},"metadata":{"policyId":"399410","externalRealm":"exp-planner","externalRealmId":"1246122"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-impl","name":"creator_row_v2_redesign_enabled"},"metadata":{"policyId":"401493","externalRealm":"exp-planner","externalRealmId":"1246710"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-resumption","name":"progress_esperanto_use_timekeeper"},"metadata":{"policyId":"402027","externalRealm":"exp-planner","externalRealmId":"1246859"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-listuxplatformconsumers-defaulttracktraitsplugin","name":"default_track_consumption_experience_trait_enabled"},"metadata":{"policyId":"402766","externalRealm":"exp-planner","externalRealmId":"1247056"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistuxplatformconsumers-sessioncontrol","name":"force_navigation_after_playlist_header_image_change_enabled"},"metadata":{"policyId":"408182","externalRealm":"exp-planner","externalRealmId":"1248652"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"video_indicator_track_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-metadata-feature","name":"fetch_associations_with_track_v4_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-musicvideos-relatedvideopage-impl","name":"npv_music_video_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying","name":"floating_music_videos_unit_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"download_music_video_metadata"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-musicvideos-artistkit","name":"autoplay_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"track_videos_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-creativeworkcommons-retrievalrow-impl","name":"track_video_indicator_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-musicvideos-musicvideoplaylistimpl","name":"playlist_video_associations_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_music_video_playback"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share-menu","name":"is_music_video_sticker_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-musicvideos-musicvideoplaylistimpl","name":"disable_playback_over_connect_speakers"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-reporting-menuaction","name":"enable_music_videos_track_reporting"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-musicvideos-artistkit","name":"show_all_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"video_carousel_section_enabled"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-playbackcontrol-audiovideoswitcher-impl","name":"enable_connect_bottom_sheet"},"metadata":{"policyId":"409824","externalRealm":"exp-planner","externalRealmId":"1249156"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-bitrate","name":"net_fortune_use_flac_average_bitrate"},"metadata":{"policyId":"410424","externalRealm":"exp-planner","externalRealmId":"1249277"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_keeping_playback_session_on_transfer"},"metadata":{"policyId":"410496","externalRealm":"exp-planner","externalRealmId":"1249297"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"timekeeper_sampling_rate"},"metadata":{"policyId":"411290","externalRealm":"exp-planner","externalRealmId":"1249560"},"intValue":{"value":100}},{"propertyId":{"scope":"core-social-listening-feature","name":"filter_session_updates"},"metadata":{"policyId":"412850","externalRealm":"exp-planner","externalRealmId":"1250176"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-bitrate","name":"car_mode_support_enabled"},"metadata":{"policyId":"412954","externalRealm":"exp-planner","externalRealmId":"1250220"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share-menu","name":"entity_sticker_width_percentage"},"metadata":{"policyId":"413646","externalRealm":"exp-planner","externalRealmId":"1250359"},"intValue":{"value":68}},{"propertyId":{"scope":"ios-feature-spotifyappprotocol","name":"inter_app_protocol_close_socket_on_connection_handler_disconnect"},"metadata":{"policyId":"413848","externalRealm":"exp-planner","externalRealmId":"1250418"},"enumValue":{"value":"None"}},{"propertyId":{"scope":"ios-carintegrations-interoperabilitymonitor","name":"enabled"},"metadata":{"policyId":"414444","externalRealm":"exp-planner","externalRealmId":"1250636"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-share","name":"is_snapchat_canvas_sharing_enabled"},"metadata":{"policyId":"414836","externalRealm":"exp-planner","externalRealmId":"1250717"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-collectionplatform","name":"snooze_flow_enabled"},"metadata":{"policyId":"414837","externalRealm":"exp-planner","externalRealmId":"1250718"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-hifi-remotedowngrade-impl","name":"is_enabled"},"metadata":{"policyId":"415642","externalRealm":"exp-planner","externalRealmId":"1250933"},"boolValue":{}},{"propertyId":{"scope":"ios-hifi-remotedowngrade-impl","name":"respect_auto_adjust"},"metadata":{"policyId":"415642","externalRealm":"exp-planner","externalRealmId":"1250933"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_play_history_shuffle_scorer_for_all"},"metadata":{"policyId":"416716","externalRealm":"exp-planner","externalRealmId":"1251244"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"multi_line_title_for_a11n_enabled"},"metadata":{"policyId":"417872","externalRealm":"exp-planner","externalRealmId":"1251642"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"is_course_review_enabled"},"metadata":{"policyId":"419120","externalRealm":"exp-planner","externalRealmId":"1252099"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-learning-course-page-impl","name":"is_course_review_prompting_enabled"},"metadata":{"policyId":"419120","externalRealm":"exp-planner","externalRealmId":"1252099"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-sociallisteningconnectentitylogic","name":"nearby_session_allow_inactive"},"metadata":{"policyId":"419444","externalRealm":"exp-planner","externalRealmId":"1252194"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-sociallistening-localnetworkbroadcasting","name":"audio_route_speaker_workaround"},"metadata":{"policyId":"419444","externalRealm":"exp-planner","externalRealmId":"1252194"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-album-albumfeatureproperties-impl","name":"prerelease_card_enabled"},"metadata":{"policyId":"419452","externalRealm":"exp-planner","externalRealmId":"1252196"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-age-verification","name":"is_account_settings_entry_point_enabled"},"metadata":{"policyId":"419697","externalRealm":"exp-planner","externalRealmId":"1259594"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-fullscreen","name":"pinch_to_zoom"},"metadata":{"policyId":"422526","externalRealm":"exp-planner","externalRealmId":"1253128"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-nowplaying-contentlayers-impl","name":"pinch_to_zoom_horizontal_video"},"metadata":{"policyId":"422526","externalRealm":"exp-planner","externalRealmId":"1253128"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"recent_suggestions_deletion_enabled"},"metadata":{"policyId":"424022","externalRealm":"exp-planner","externalRealmId":"1253588"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-modes","name":"video_optionality_switch_button"},"metadata":{"policyId":"424086","externalRealm":"exp-planner","externalRealmId":"1253626"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-videocoordinator","name":"video_enabled_locally_setting"},"metadata":{"policyId":"424086","externalRealm":"exp-planner","externalRealmId":"1253626"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-account-common","name":"premium_referrals_settings_item_enabled"},"metadata":{"policyId":"424441","externalRealm":"exp-planner","externalRealmId":"1266938"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-jam-platformimpl","name":"enable_new_refresh_event_source"},"metadata":{"policyId":"424611","externalRealm":"exp-planner","externalRealmId":"1253809"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_shuffle_played_tracks_order"},"metadata":{"policyId":"425438","externalRealm":"exp-planner","externalRealmId":"1254073"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-audiobook-audiobook-request-listening-hours","name":"feature_enabled"},"metadata":{"policyId":"425613","externalRealm":"exp-planner","externalRealmId":"1264405"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-audiobook-featureproperties-impl","name":"consumption_tracking_add_ons_redesign"},"metadata":{"policyId":"425613","externalRealm":"exp-planner","externalRealmId":"1264405"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-account-common","name":"premium_plans_entry_point_row_enabled"},"metadata":{"policyId":"425613","externalRealm":"exp-planner","externalRealmId":"1264405"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-audiobook-consideration-page","name":"is_page_enabled"},"metadata":{"policyId":"425613","externalRealm":"exp-planner","externalRealmId":"1264405"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-audiobook-featureproperties-impl","name":"use_new_consumption_tracking_layout_backend"},"metadata":{"policyId":"425613","externalRealm":"exp-planner","externalRealmId":"1264405"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-available-plans-page","name":"addons_enabled"},"metadata":{"policyId":"425613","externalRealm":"exp-planner","externalRealmId":"1264405"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-add-on-management-page","name":"is_page_enabled"},"metadata":{"policyId":"425613","externalRealm":"exp-planner","externalRealmId":"1264405"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ad-detection","name":"enable"},"metadata":{"policyId":"426187","externalRealm":"exp-planner","externalRealmId":"1254321"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ad-detection","name":"enable_boundary_enhancement"},"metadata":{"policyId":"426187","externalRealm":"exp-planner","externalRealmId":"1254321"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-download-feature","name":"passthrough_full_file_download"},"metadata":{"policyId":"426187","externalRealm":"exp-planner","externalRealmId":"1254321"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-excerpts","name":"disable_for_static"},"metadata":{"policyId":"426188","externalRealm":"exp-planner","externalRealmId":"1254322"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-podcast-platform-player","name":"enable_creator_timestamp"},"metadata":{"policyId":"426188","externalRealm":"exp-planner","externalRealmId":"1254322"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-login","name":"recaptcha_token_timeout_millis"},"metadata":{"policyId":"426783","externalRealm":"exp-planner","externalRealmId":"1254521"},"intValue":{"value":5000}},{"propertyId":{"scope":"core-automix","name":"max_auto_transition_length_seconds"},"metadata":{"policyId":"426866","externalRealm":"exp-planner","externalRealmId":"1255664"},"intValue":{"value":29}},{"propertyId":{"scope":"ios-feature-yourlibrarymusic-playlist","name":"graduation_chip_enabled"},"metadata":{"policyId":"426930","externalRealm":"exp-planner","externalRealmId":"1254551"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibrarymusic-playlist","name":"nested_chips_section_enabled"},"metadata":{"policyId":"426930","externalRealm":"exp-planner","externalRealmId":"1254551"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-alignedcuration","name":"shelf_remove_from_collection_enabled"},"metadata":{"policyId":"426935","externalRealm":"exp-planner","externalRealmId":"1254557"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-alignedcuration","name":"first_save_sheet_enabled"},"metadata":{"policyId":"426935","externalRealm":"exp-planner","externalRealmId":"1254557"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-age-verification","name":"age_specific_bottom_sheet_copy_enabled"},"metadata":{"policyId":"427498","externalRealm":"exp-planner","externalRealmId":"1259595"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"supports_ping_request"},"metadata":{"policyId":"427597","externalRealm":"exp-planner","externalRealmId":"1254718"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-smartshuffle-experience-impl","name":"use_product_state_experience_resolver"},"metadata":{"policyId":"428397","externalRealm":"exp-planner","externalRealmId":"1260633"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-sociallisteningconnectentitylogic","name":"nearby_session_enable_visibility_filter"},"metadata":{"policyId":"428464","externalRealm":"exp-planner","externalRealmId":"1254981"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistcuration-playlistcompactheader","name":"enable_compact_header"},"metadata":{"policyId":"428781","externalRealm":"exp-planner","externalRealmId":"1255067"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-listuxplatformconsumers-playlistemptystate","name":"compact_empty_state_enabled"},"metadata":{"policyId":"428781","externalRealm":"exp-planner","externalRealmId":"1255067"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-aidjinteractivity-impl","name":"enable_npv_scroll_card"},"metadata":{"policyId":"430982","externalRealm":"exp-planner","externalRealmId":"1255701"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-aidjinteractivity-impl","name":"enable_npv_scroll_card_animation"},"metadata":{"policyId":"430982","externalRealm":"exp-planner","externalRealmId":"1255701"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-submitfeedbackpage-impl","name":"enable_dj_feedback"},"metadata":{"policyId":"430982","externalRealm":"exp-planner","externalRealmId":"1255701"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-endless-aidjinteractivity-impl","name":"interactivity_timeout"},"metadata":{"policyId":"430982","externalRealm":"exp-planner","externalRealmId":"1255701"},"enumValue":{"value":"seconds_20"}},{"propertyId":{"scope":"ios-jam-socialradarsender","name":"metrics_enabled"},"metadata":{"policyId":"432434","externalRealm":"exp-planner","externalRealmId":"1256121"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-remotedownloads-offline2","name":"enable_audiobooks"},"metadata":{"policyId":"432459","externalRealm":"exp-planner","externalRealmId":"1256122"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_comments_intent_interceptor"},"metadata":{"policyId":"433138","externalRealm":"exp-planner","externalRealmId":"1256330"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-comments","name":"enable_pinned_comments"},"metadata":{"policyId":"433174","externalRealm":"exp-planner","externalRealmId":"1256345"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-encore-experiments","name":"enable_ecm_core_kit_secondary_button_migration"},"metadata":{"policyId":"437768","externalRealm":"exp-planner","externalRealmId":"1257730"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-liveaudio-livestreampage","name":"join_web_additional_button_enabled"},"metadata":{"policyId":"437969","externalRealm":"exp-planner","externalRealmId":"1257804"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-share-destinationhandler-impl","name":"instagram_notes_expiration_date"},"metadata":{"policyId":"438522","externalRealm":"exp-planner","externalRealmId":"1257951"},"intValue":{"value":1755628800}},{"propertyId":{"scope":"ios-feature-ads","name":"comscore_enabled"},"metadata":{"policyId":"440601","externalRealm":"exp-planner","externalRealmId":"1258556"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-campfire-properties-impl","name":"campfire_feature_enabled"},"metadata":{"policyId":"441784","externalRealm":"exp-planner","externalRealmId":"1261004"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-campfire-properties-impl","name":"enable_soft_crash_when_link_dispatcher_unresponsive"},"metadata":{"policyId":"441784","externalRealm":"exp-planner","externalRealmId":"1261004"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-campfire-properties-impl","name":"nudge_retrieval_feature_enabled"},"metadata":{"policyId":"441784","externalRealm":"exp-planner","externalRealmId":"1261004"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-campfire-platform-impl","name":"is_magic_link_enabled"},"metadata":{"policyId":"441784","externalRealm":"exp-planner","externalRealmId":"1261004"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistcuration-mats","name":"bar_duration_snap_percentage"},"metadata":{"policyId":"441801","externalRealm":"exp-planner","externalRealmId":"1260133"},"intValue":{"value":20}},{"propertyId":{"scope":"ios-jam-jam","name":"enable_network_metadata_for_token_resolution"},"metadata":{"policyId":"444078","externalRealm":"exp-planner","externalRealmId":"1259572"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-campfire-properties-impl","name":"copy_free_text_message_enabled"},"metadata":{"policyId":"444707","externalRealm":"exp-planner","externalRealmId":"1259696"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-watchfeed-feature-impl","name":"ubi_impression_v2_enabled"},"metadata":{"policyId":"445374","externalRealm":"exp-planner","externalRealmId":"1259952"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistcuration-mats","name":"available_styles_version"},"metadata":{"policyId":"446006","externalRealm":"exp-planner","externalRealmId":"1265694"},"intValue":{"value":3}},{"propertyId":{"scope":"ios-campfire-properties-impl","name":"group_chats_enabled"},"metadata":{"policyId":"449097","externalRealm":"exp-planner","externalRealmId":"1261003"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-notificationsv2","name":"preferences_use_v8_api"},"metadata":{"policyId":"449097","externalRealm":"exp-planner","externalRealmId":"1261003"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-campfire-platform-impl","name":"is_redirect_enabled"},"metadata":{"policyId":"449097","externalRealm":"exp-planner","externalRealmId":"1261003"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-jam","name":"enable_self_token_filtering"},"metadata":{"policyId":"450658","externalRealm":"exp-planner","externalRealmId":"1261420"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-churnlock","name":"swift_service_enabled"},"metadata":{"policyId":"450771","externalRealm":"exp-planner","externalRealmId":"1261463"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"condensed_home_shortcuts_enabled"},"metadata":{"policyId":"451466","externalRealm":"exp-planner","externalRealmId":"1261719"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-navigation-homecoming","name":"homecoming_enabled"},"metadata":{"policyId":"451715","externalRealm":"exp-planner","externalRealmId":"1261758"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-navigation-homecoming","name":"homecoming_inactivity_period_in_minutes"},"metadata":{"policyId":"451715","externalRealm":"exp-planner","externalRealmId":"1261758"},"intValue":{"value":120}},{"propertyId":{"scope":"core-social-listening-feature","name":"is_active_based_on_session_attribute"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-social-listening-feature","name":"clear_session_on_connection_lost_timeout"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"intValue":{"value":10}},{"propertyId":{"scope":"core-playlist-feature","name":"append_ignore_enhance_lens_to_context_url"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-social-listening-feature","name":"disable_jam_mode_when_session_timeout"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"enable_shared_content_smart_shuffle_settings"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"control_smart_shuffle_via_player_options"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-playlist-feature","name":"emit_enhanced_ctx_metadata_in_play_command"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-contextualshuffle","name":"write_to_centralized_shuffle_state"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"migrate_to_centralized_shuffle_state"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"write_to_centralized_shuffle_state"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"read_from_centralized_shuffle_state"},"metadata":{"policyId":"452508","externalRealm":"exp-planner","externalRealmId":"1261979"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lyrics","name":"enable_lyrics_character_count_fix"},"metadata":{"policyId":"454839","externalRealm":"exp-planner","externalRealmId":"1262423"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-creator-impl","name":"is_unmapped_music_videos_section_enabled"},"metadata":{"policyId":"454928","externalRealm":"exp-planner","externalRealmId":"1268376"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-freetierartist","name":"unmapped_music_video_deeplink_enabled"},"metadata":{"policyId":"454928","externalRealm":"exp-planner","externalRealmId":"1268376"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-lockscreen","name":"crop_unmapped_mv_images"},"metadata":{"policyId":"454928","externalRealm":"exp-planner","externalRealmId":"1268376"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-search-recentslist-impl","name":"prefetching_enabled"},"metadata":{"policyId":"455694","externalRealm":"exp-planner","externalRealmId":"1262699"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"your_library_pro_enabled"},"metadata":{"policyId":"455829","externalRealm":"exp-planner","externalRealmId":"1262721"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-your-library-tags-feature","name":"core_activate_tags_backend_client"},"metadata":{"policyId":"455829","externalRealm":"exp-planner","externalRealmId":"1262721"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-playlist-feature","name":"enable_booklist_context_resolve"},"metadata":{"policyId":"456742","externalRealm":"exp-planner","externalRealmId":"1262992"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-freetierplaylist","name":"enable_play_for_lists_with_audiobook_content"},"metadata":{"policyId":"456742","externalRealm":"exp-planner","externalRealmId":"1262992"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-freetierplaylist","name":"allow_playing_items_with_no_available_play_state"},"metadata":{"policyId":"456742","externalRealm":"exp-planner","externalRealmId":"1262992"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistuxplatformconsumers-audiobook-plugin","name":"enable_play_audiobook_in_list_context"},"metadata":{"policyId":"456742","externalRealm":"exp-planner","externalRealmId":"1262992"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-automix","name":"auto_transition_downbeat_confidence_threshold"},"metadata":{"policyId":"457352","externalRealm":"exp-planner","externalRealmId":"1263327"},"intValue":{"value":40}},{"propertyId":{"scope":"ios-nowplaying-scroll-impl","name":"nova_scroll_peek_animation_delay"},"metadata":{"policyId":"459375","externalRealm":"exp-planner","externalRealmId":"1263764"},"intValue":{"value":100}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"album_release_date_sort_order"},"metadata":{"policyId":"459851","externalRealm":"exp-planner","externalRealmId":"1263954"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-yourlibaryx","name":"album_new_release_icon"},"metadata":{"policyId":"459851","externalRealm":"exp-planner","externalRealmId":"1263954"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"recents_shelf_synchronize_strategy_enabled"},"metadata":{"policyId":"462182","externalRealm":"exp-planner","externalRealmId":"1264838"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-podcastuiplatform-podcastimpl","name":"disable_store"},"metadata":{"policyId":"462750","externalRealm":"exp-planner","externalRealmId":"1264982"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-offline","name":"use_per_context_metadata_handling"},"metadata":{"policyId":"463068","externalRealm":"exp-planner","externalRealmId":"1265033"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-premium-destination-page","name":"enable_elements"},"metadata":{"policyId":"463806","externalRealm":"exp-planner","externalRealmId":"1265197"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"allow_smart_shuffle_in_jams"},"metadata":{"policyId":"464890","externalRealm":"exp-planner","externalRealmId":"1265458"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"jam_education_snackbar_enabled"},"metadata":{"policyId":"464890","externalRealm":"exp-planner","externalRealmId":"1265458"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-player","name":"disable_smart_shuffle_when_in_jam"},"metadata":{"policyId":"464890","externalRealm":"exp-planner","externalRealmId":"1265458"},"boolValue":{}},{"propertyId":{"scope":"core-playlist-feature","name":"emit_recommendations_in_play_command"},"metadata":{"policyId":"464890","externalRealm":"exp-planner","externalRealmId":"1265458"},"boolValue":{}},{"propertyId":{"scope":"core-your-library-feature","name":"core_your_library_decorate_mats"},"metadata":{"policyId":"466630","externalRealm":"exp-planner","externalRealmId":"1266036"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-nowplaying-elements","name":"mixing_play_button"},"metadata":{"policyId":"466630","externalRealm":"exp-planner","externalRealmId":"1266036"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-audio-track-player-feature","name":"dynamic_switch_to_mixer_enabled"},"metadata":{"policyId":"466630","externalRealm":"exp-planner","externalRealmId":"1266036"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"supports_automix"},"metadata":{"policyId":"466630","externalRealm":"exp-planner","externalRealmId":"1266036"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistcuration-mats","name":"is_enabled"},"metadata":{"policyId":"466630","externalRealm":"exp-planner","externalRealmId":"1266036"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-playlist-feature","name":"should_offline_mix_state"},"metadata":{"policyId":"466630","externalRealm":"exp-planner","externalRealmId":"1266036"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-time-stretcher-advanced-feature","name":"enable_time_stretcher_advanced"},"metadata":{"policyId":"466630","externalRealm":"exp-planner","externalRealmId":"1266036"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistcuration-mats","name":"allow_edit_page_for_any_user"},"metadata":{"policyId":"466632","externalRealm":"exp-planner","externalRealmId":"1266038"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_on_watch_feed_entrypoint_enabled"},"metadata":{"policyId":"466729","externalRealm":"exp-planner","externalRealmId":"1269965"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_on_watch_feed_enabled"},"metadata":{"policyId":"466729","externalRealm":"exp-planner","externalRealmId":"1269965"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kubrick_progressive_on_watch_feed_entrypoint_enabled"},"metadata":{"policyId":"466730","externalRealm":"exp-planner","externalRealmId":"1266917"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-download","name":"progressive_video_request_size_data_kb"},"metadata":{"policyId":"466731","externalRealm":"exp-planner","externalRealmId":"1266915"},"intValue":{"value":1048576}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kubrick_buffer_configuration_minimum_duration_to_start_ms"},"metadata":{"policyId":"466731","externalRealm":"exp-planner","externalRealmId":"1266915"},"intValue":{"value":1000}},{"propertyId":{"scope":"core-download","name":"progressive_video_request_size_allow_modification"},"metadata":{"policyId":"466731","externalRealm":"exp-planner","externalRealmId":"1266915"},"boolValue":{}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kubrick_buffer_configuration_progressive_initial_request_size_in_bytes"},"metadata":{"policyId":"466731","externalRealm":"exp-planner","externalRealmId":"1266915"},"intValue":{"value":100000}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kubrick_buffer_configuration_forward_buffer_while_paused_ms"},"metadata":{"policyId":"466731","externalRealm":"exp-planner","externalRealmId":"1266915"},"intValue":{"value":2000}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kubrick_buffer_configuration_minimum_threshold_ms"},"metadata":{"policyId":"466731","externalRealm":"exp-planner","externalRealmId":"1266915"},"intValue":{"value":2000}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kubrick_progressive_on_watch_feed_enabled"},"metadata":{"policyId":"466731","externalRealm":"exp-planner","externalRealmId":"1266915"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kubrick_buffer_configuration_forward_buffer_while_playing_ms"},"metadata":{"policyId":"466731","externalRealm":"exp-planner","externalRealmId":"1266915"},"intValue":{"value":4000}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kubrick_should_early_load_metadata"},"metadata":{"policyId":"466731","externalRealm":"exp-planner","externalRealmId":"1266915"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kubrick_progressive_on_audiobrowse_enabled"},"metadata":{"policyId":"466732","externalRealm":"exp-planner","externalRealmId":"1266916"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-live","name":"enable_beta_venue_section_tag"},"metadata":{"policyId":"467198","externalRealm":"exp-planner","externalRealmId":"1266244"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-podcast-ads","name":"podcast_use_executor"},"metadata":{"policyId":"467895","externalRealm":"exp-planner","externalRealmId":"1266421"},"boolValue":{}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_on_wrapped_enabled"},"metadata":{"policyId":"468480","externalRealm":"exp-planner","externalRealmId":"1266920"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_on_npv_music_videos_enabled"},"metadata":{"policyId":"469748","externalRealm":"exp-planner","externalRealmId":"1269979"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_on_npv_podcasts_enabled"},"metadata":{"policyId":"469748","externalRealm":"exp-planner","externalRealmId":"1269979"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_stop_requesting_video_data_on_screen_locked"},"metadata":{"policyId":"469748","externalRealm":"exp-planner","externalRealmId":"1269979"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_on_audiobrowse_enabled"},"metadata":{"policyId":"469776","externalRealm":"exp-planner","externalRealmId":"1266923"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-connect-feature","name":"is_auth_info_credential_enabled"},"metadata":{"policyId":"470287","externalRealm":"exp-planner","externalRealmId":"1267093"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-sleeptimer","name":"ubiquity_sleep_timer"},"metadata":{"policyId":"471271","externalRealm":"exp-planner","externalRealmId":"1267458"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-search","name":"stp_multiline_max_visible_lines"},"metadata":{"policyId":"472225","externalRealm":"exp-planner","externalRealmId":"1267792"},"intValue":{"value":3}},{"propertyId":{"scope":"ios-playlistcuration-mats","name":"duplicate_mix_experience_for_non_owners_enabled"},"metadata":{"policyId":"473228","externalRealm":"exp-planner","externalRealmId":"1268034"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistcuration-mats","name":"duplicate_mix_experience_for_non_owners_context_menu_action_enabled"},"metadata":{"policyId":"473230","externalRealm":"exp-planner","externalRealmId":"1268036"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-playlistcuration-mats","name":"maximum_number_of_bars"},"metadata":{"policyId":"473232","externalRealm":"exp-planner","externalRealmId":"1268037"},"intValue":{"value":16}},{"propertyId":{"scope":"ios-feature-remoteconfiguration","name":"example_boolean"},"metadata":{"policyId":"473253","externalRealm":"exp-planner","externalRealmId":"1268047"},"boolValue":{}},{"propertyId":{"scope":"ios-share-destinationhandler-impl","name":"is_instagram_notes_enabled"},"metadata":{"policyId":"474107","externalRealm":"exp-planner","externalRealmId":"1268328"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_temp_transition_on_foreground_when_paused"},"metadata":{"policyId":"474847","externalRealm":"exp-planner","externalRealmId":"1269163"},"boolValue":{}},{"propertyId":{"scope":"ios-watchfeed-npvprovider","name":"should_use_elements_for_nova_scroll"},"metadata":{"policyId":"475235","externalRealm":"exp-planner","externalRealmId":"1268662"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ad-detection","name":"enable_dai_verification"},"metadata":{"policyId":"475426","externalRealm":"exp-planner","externalRealmId":"1268708"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ad-detection","name":"enable_binary_search"},"metadata":{"policyId":"475426","externalRealm":"exp-planner","externalRealmId":"1268708"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-campfire-properties-impl","name":"remove_suggested_user_enabled"},"metadata":{"policyId":"476089","externalRealm":"exp-planner","externalRealmId":"1268908"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-collectiondataloader","name":"enable_fetch_tracks_on_list_endpoint_data_loader"},"metadata":{"policyId":"476910","externalRealm":"exp-planner","externalRealmId":"1269115"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-collectiondataloader","name":"enable_streamtracklist_on_list_endpoint_data_loader"},"metadata":{"policyId":"476910","externalRealm":"exp-planner","externalRealmId":"1269115"},"boolValue":{}},{"propertyId":{"scope":"core-common-capping","name":"init_retry_initial_interval"},"metadata":{"policyId":"477023","externalRealm":"exp-planner","externalRealmId":"1269165"},"intValue":{"value":1000}},{"propertyId":{"scope":"core-common-capping","name":"init_retry_jitter_percentage"},"metadata":{"policyId":"477023","externalRealm":"exp-planner","externalRealmId":"1269165"},"intValue":{"value":25}},{"propertyId":{"scope":"ios-feature-jamuiimpl","name":"enable_deeplink_flow"},"metadata":{"policyId":"477138","externalRealm":"exp-planner","externalRealmId":"1269210"},"boolValue":{}},{"propertyId":{"scope":"ios-sociallistening-joingroupsession-impl","name":"jam_deeplink_handler_enabled"},"metadata":{"policyId":"477138","externalRealm":"exp-planner","externalRealmId":"1269210"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-system-smartshuffle","name":"liked_songs_count_on_list_endpoint_data_loader_enabled"},"metadata":{"policyId":"477581","externalRealm":"exp-planner","externalRealmId":"1269383"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-lockscreen","name":"clear_now_playing_info_when_connect_lockscreen_control_disabled"},"metadata":{"policyId":"477684","externalRealm":"exp-planner","externalRealmId":"1269429"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-reinventfree-timecappivot-impl","name":"track_time_cap_migration_enabled"},"metadata":{"policyId":"477790","externalRealm":"exp-planner","externalRealmId":"1269459"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-home-evopage-impl","name":"interactive_entrypoint_beta_tag_enabled"},"metadata":{"policyId":"477803","externalRealm":"exp-planner","externalRealmId":"1269465"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-content-formats-feature","name":"show_write_hook_use_new_write_hook_methods"},"metadata":{"policyId":"477926","externalRealm":"exp-planner","externalRealmId":"1269493"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-collection-feature","name":"episode_publish_date_index_write_hook_use_new_write_hook_methods"},"metadata":{"policyId":"477929","externalRealm":"exp-planner","externalRealmId":"1269494"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-upcoming-releaseshubpage-impl","name":"top_presaved_prereleases_highlight"},"metadata":{"policyId":"478281","externalRealm":"exp-planner","externalRealmId":"1269628"},"enumValue":{"value":"count"}},{"propertyId":{"scope":"ios-feature-search","name":"recents_gen_alpha_safety_filtering_enabled"},"metadata":{"policyId":"478474","externalRealm":"exp-planner","externalRealmId":"1269735"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-eventsender","name":"send_events_in_background"},"metadata":{"policyId":"479079","externalRealm":"exp-planner","externalRealmId":"1269878"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-eventsender","name":"instrument_background_sending"},"metadata":{"policyId":"479079","externalRealm":"exp-planner","externalRealmId":"1269878"},"boolValue":{}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_back_buf_playing_ms"},"metadata":{"policyId":"479363","externalRealm":"exp-planner","externalRealmId":"1269968"},"intValue":{"value":60000}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_fwd_aud_buf_playing_long_form_ms"},"metadata":{"policyId":"479363","externalRealm":"exp-planner","externalRealmId":"1269968"},"intValue":{"value":300000}},{"propertyId":{"scope":"ios-feature-cover-art-snake","name":"enabled"},"metadata":{"policyId":"479371","externalRealm":"exp-planner","externalRealmId":"1269971"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_seg_loader_timer_interval_ms"},"metadata":{"policyId":"479374","externalRealm":"exp-planner","externalRealmId":"1269977"},"intValue":{"value":300}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_seg_loader_audio_mode_count"},"metadata":{"policyId":"479374","externalRealm":"exp-planner","externalRealmId":"1269977"},"intValue":{"value":4}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_bw_estimator_slow_ramp_up_multiplier"},"metadata":{"policyId":"479378","externalRealm":"exp-planner","externalRealmId":"1269978"},"intValue":{"value":50}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_bw_estimator_fast_ramp_down_multiplier"},"metadata":{"policyId":"479378","externalRealm":"exp-planner","externalRealmId":"1269978"},"intValue":{"value":100}},{"propertyId":{"scope":"ios-betamax-sdkintegration","name":"kub_adap_bw_estimator_slow_ramp_down_multiplier"},"metadata":{"policyId":"479378","externalRealm":"exp-planner","externalRealmId":"1269978"},"intValue":{"value":35}},{"propertyId":{"scope":"ios-feature-connectflags","name":"enable_new_device_picker_ubi"},"metadata":{"policyId":"480458","externalRealm":"exp-planner","externalRealmId":"1270329"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-connectflags","name":"enable_device_discovery_snapshot"},"metadata":{"policyId":"480459","externalRealm":"exp-planner","externalRealmId":"1270330"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-connectflags","name":"device_discovery_snapshot_minutes_between_updates"},"metadata":{"policyId":"480459","externalRealm":"exp-planner","externalRealmId":"1270330"},"intValue":{"value":5}},{"propertyId":{"scope":"ios-feature-search","name":"new_recents_performance_optimizations_enabled"},"metadata":{"policyId":"480521","externalRealm":"exp-planner","externalRealmId":"1270359"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-jam","name":"enable_range_metadata_for_token_resolution"},"metadata":{"policyId":"481368","externalRealm":"exp-planner","externalRealmId":"1270711"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-socialradarreceiver","name":"enable_extended_range"},"metadata":{"policyId":"481368","externalRealm":"exp-planner","externalRealmId":"1270711"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-jam-socialradarsender","name":"extended_range_enabled"},"metadata":{"policyId":"481368","externalRealm":"exp-planner","externalRealmId":"1270711"},"boolValue":{"value":true}}];
const blacklist = [{"propertyId":{"scope":"ios-feature-contextualshuffle","name":"is_enabled_for_on_demand_trial"},"metadata":{"policyId":"194505","externalRealm":"exp-planner","externalRealmId":"1226379"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-reinventfree-contextualupsellpremiumpromo-impl","name":"is_promo_cta_enabled"},"metadata":{"policyId":"537443","externalRealm":"exp-planner","externalRealmId":"1288256"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-reinventfree-timecappivot-impl","name":"music_video_upsell_enabled"},"metadata":{"policyId":"499774","externalRealm":"exp-planner","externalRealmId":"10000216"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-reinventfree-contextualupsellpremiumpromo-impl","name":"show_time_cap_upsell_with_premium_badge"},"metadata":{"policyId":"537443","externalRealm":"exp-planner","externalRealmId":"1288256"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-reinventfree-controllerui-impl","name":"enable_video_time_cap_upsell"},"metadata":{"policyId":"499774","externalRealm":"exp-planner","externalRealmId":"10000216"},"boolValue":{"value":false}},{"propertyId":{"scope":"ios-reinventfree-controllerui-impl","name":"enable_video_time_cap_upsell_on_search"},"metadata":{"policyId":"515362","externalRealm":"exp-planner","externalRealmId":"1276915"},"boolValue":{"value":false}},{"propertyId":{"scope":"core-player","name":"enable_music_video_premium_check"},"metadata":{"policyId":"515362","externalRealm":"exp-planner","externalRealmId":"1276915"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-freetierplaylist","name":"hide_video_badge_for_tracks"},"metadata":{"policyId":"515362","externalRealm":"exp-planner","externalRealmId":"1276915"},"boolValue":{}},{"propertyId":{"scope":"ios-system-available-plans-page","name":"experiment_first_card_disable"},"metadata":{"policyId":"574308","externalRealm":"exp-planner","externalRealmId":"1282020"},"boolValue":{}},{"propertyId":{"scope":"core-restrictions","name":"enable_can_play_content_extended_verdict"},"metadata":{"policyId":"520265","externalRealm":"exp-planner","externalRealmId":"10000874"},"enumValue":{}},{"propertyId":{"scope":"ios-learning-homeonboardingpage-impl","name":"onboarding_page_enabled"},"metadata":{"policyId":"249059","externalRealm":"exp-planner","externalRealmId":"1197166"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-ads","name":"restrict_swipe_to_skip"},"metadata":{"policyId":"575147","externalRealm":"exp-planner","externalRealmId":"1292365"},"boolValue":{"value":true}},{"propertyId":{"scope":"core-scrobble","name":"global_private_session_enabled"},"metadata":{"policyId":"498992","externalRealm":"exp-planner","externalRealmId":"10000202"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-listening-activity","name":"listening_activity_enabled"},"metadata":{"policyId":"522819","externalRealm":"exp-planner","externalRealmId":"10001086"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-contextualshuffle","name":"is_enabled_for_on_demand_trial"},"metadata":{"policyId":"194505","externalRealm":"exp-planner","externalRealmId":"1226379"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-remoteconfiguration-bootstrap-impl","name":"login_trials_enabled"},"metadata":{"policyId":"306423","externalRealm":"exp-planner","externalRealmId":"1216800"},"boolValue":{}},{"propertyId":{"scope":"ios-feature-ondemandtrial","name":"enable_call_trials_facade"},"metadata":{"policyId":"306423","externalRealm":"exp-planner","externalRealmId":"1216800"},"boolValue":{"value":true}},{"propertyId":{"scope":"ios-feature-contextualshuffle","name":"is_enabled_for_on_demand_trial"},"metadata":{"policyId":"194505","externalRealm":"exp-planner","externalRealmId":"1226379"},"boolValue":{"value":true}}];
const resStatus = Number($response.status || $response.statusCode);
if (resStatus !== 200) {
  console.log(`spotify-proto: response status ${resStatus}, passthrough`);
  $done({});
} else {
  try {
    const isQuanX = typeof $task !== "undefined";
    const binaryBody = isQuanX
      ? new Uint8Array($response.bodyBytes)
      : $response.body;
    const body = patchSpotifyConfiguration(
      $request.url,
      $request.method,
      binaryBody,
    );
    if (!body) {
      $done({});
    } else if (isQuanX) {
      $done({
        bodyBytes: body.buffer.slice(
          body.byteOffset,
          body.byteOffset + body.byteLength,
        ),
      });
    } else {
      $done({ body });
    }
  } catch (error) {
    console.log(`spotify-proto: ${error.message || error}, passthrough`);
    $done({});
  }
}

function patchSpotifyConfiguration(url, method, binaryBody) {
  const path = url
    .replace(/^https?:\/\/[^/]+/i, "")
    .split(/[?#]/)[0]
    .replace(/\/+$/, "");
  const root = protobuf.Root.fromJSON(spotifyJson);
  let type;
  let message;

  if (path === "/nebula/v1/configuration/attributes" && method === "GET") {
    type = root.lookupType("AccountAttributesResponse");
    message = type.decode(binaryBody);
    if (!Object.keys(message.accountAttributes).length) {
      throw new Error("nebula response has no account attributes");
    }
    modifyAttributes(message.accountAttributes);
    console.log("spotify-proto 2026.11.10: nebula account attributes patched");
  } else if (
    path === "/remote-config-resolver/v3/configuration" && method === "POST"
  ) {
    type = root.lookupType("ResolveResponse");
    message = type.decode(binaryBody);
    const values = message.configuration?.assignedValues;
    if (!values?.length) {
      throw new Error("resolver response has no assigned values");
    }
    // New clients ship flags unknown to this script. Keep those server values.
    overrideAssignedValues(values, true);
    console.log("spotify-proto 2026.11.10: resolver configuration patched");
  } else if (path === "/bootstrap/v1/bootstrap" && method === "POST") {
    type = root.lookupType("BootstrapResponse");
    message = type.decode(binaryBody);
    const customization = message.ucsResponseV0.success.customization.success;
    processMapObj(
      customization.accountAttributesSuccess.accountAttributes,
      customization.resolveSuccess.configuration.assignedValues,
    );
    delete message.trialsFacadeResponseV1;
    console.log("spotify-proto 2026.11.10: bootstrap patched");
  } else if (
    path === "/user-customization-service/v1/customize" && method === "POST"
  ) {
    type = root.lookupType("UcsResponseWrapper");
    message = type.decode(binaryBody);
    processMapObj(
      message.success.accountAttributesSuccess.accountAttributes,
      message.success.resolveSuccess.configuration.assignedValues,
    );
    console.log("spotify-proto 2026.11.10: customize patched");
  } else {
    console.log(`spotify-proto: unsupported request ${method} ${path}`);
    return;
  }
  return type.encode(message).finish();
}

function modifyAssignedValues(values) {
  for (const rule of rules) {
    const matchingIndices = values
      .map((_, index) => index)
      .filter((index) => {
        const value = values[index];
        const nameMatches =
          rule.name != null ? value.propertyId.name === rule.name : true;
        const scopeMatches =
          rule.scope != null ? value.propertyId.scope === rule.scope : true;
        return nameMatches && scopeMatches;
      });

    for (const index of matchingIndices.sort((a, b) => b - a)) {
      switch (rule.action) {
        case "remove":
          values.splice(index, 1);
          //console.log(`删除${index}号字段`);
          if (rule.name) console.log(`删除${rule.name}`);
          if (rule.scope) console.log(`删除${rule.scope}`);
          break;

        case "setBool":
          values[index].boolValue = { value: rule.value };
          //console.log(`在${index}位置重设bool值`);
          if (rule.name) console.log(`修改${rule.name}的Bool值`);
          if (rule.scope) console.log(`修改${rule.scope}的Bool值`);
          break;

        case "setEnum":
          values[index].enumValue = { value: rule.value };
          //console.log(`在${index}位置重设enum值`);
          if (rule.name) console.log(`修改${rule.name}的Enum值`);
          if (rule.scope) console.log(`修改${rule.scope}的Enum值`);
          break;
      }
    }
    //console.log("==========");
  }

  console.log("assignedValuesMapObj processed");
}

function modifyAttributes(attributes) {
  // 1 year from now
  const oneYearFromNow = new Date();
  oneYearFromNow.setUTCFullYear(oneYearFromNow.getUTCFullYear() + 1);

  // ISO8601 UTC string (equivalent to ISO8601DateFormatter + UTC)
  const isoDate = oneYearFromNow.toISOString();

  attributes["ads"] = { boolValue: false };
  attributes["ab-ad-player-targeting"] = { stringValue: "0" };
  attributes["allow-advertising-id-transmission"] = { boolValue: false };
  attributes["restrict-advertising-id-transmission"] = { boolValue: true };
  attributes["can_use_superbird"] = { boolValue: true };
  attributes["catalogue"] = { stringValue: "premium" };
  attributes["financial-product"] = { stringValue: "pr:premium,tc:0" };
  attributes["is-eligible-premium-unboxing"] = { boolValue: true };
  attributes["name"] = { stringValue: "Spotify Premium" };
  attributes["nft-disabled"] = { stringValue: "1" };
  attributes["offline"] = { boolValue: true }; // allow downloading
  attributes["on-demand"] = { boolValue: true };
  attributes["payments-initial-campaign"] = { stringValue: "default" };
  attributes["player-license"] = { stringValue: "premium" };
  attributes["player-license-v2"] = { stringValue: "premium" };
  attributes["product-expiry"] = { stringValue: isoDate };
  attributes["shuffle-eligible"] = { boolValue: true };
  attributes["social-session"] = { boolValue: true };
  attributes["social-session-free-tier"] = { boolValue: false };
  attributes["streaming-rules"] = { stringValue: "" };
  attributes["subscription-enddate"] = { stringValue: isoDate };
  attributes["type"] = { stringValue: "premium" };
  attributes["unrestricted"] = { boolValue: true };

  delete attributes["ad-use-adlogic"];
  delete attributes["ad-catalogues"];

  delete attributes["shuffle"]; // 移除 shuffle 属性，由 shuffle-eligible 控制

  delete attributes["payment-state"];
  delete attributes["last-premium-activation-date"];

  // Modern logout prevention
  delete attributes["on-demand-trial"];
  delete attributes["on-demand-trial-in-progress"];
  delete attributes["smart-shuffle"];

  // Additional keys
  delete attributes["at-signal"];
  delete attributes["feature-set-id-masked"];
  delete attributes["strider-key"];
  delete attributes["is-eligible-for-trial"];
  delete attributes["is-eligible-for-upsell"];
  delete attributes["upsell-state"];
  delete attributes["ad-session-persistence"];
  delete attributes["ad-formats-preroll-video"];

  for (let i = 1; i <= 100; i++) {
    delete attributes[`is-premium-eligible-v${i}`];
  }
  delete attributes["is-premium-eligible"];

  console.log("accountAttributesMapObj processed");
}

// function overrideAssignedValues(target) {
//   console.log("正在进行覆盖......");

//   target.length = 0; // 清空原数据
//   let num=0;
//   for (const item of OVERRIDE_ASSIGNED_VALUES) {
//     target.push(item);
//     num++;
//   }

//   console.log(`成功覆盖${num}个字段`);
// }

function preserveServerAudio(item) { return /bitrate|lossless|codec|flac|vorbis|opus|audio[-_]?quality|streaming[-_]?quality/i.test(item.propertyId.scope + '::' + item.propertyId.name); }
function overrideAssignedValues(target, preserveUnspecified = true) {
  console.log("正在进行合并覆盖......");

  let numAdded = 0;

  const result = [];
  const map = new Map();
  let n = 0;
  let f = 0;

  // 把 blacklist 转成 Set（加速查询）
  const blacklistSet = new Set(
    blacklist.filter(item => !preserveServerAudio(item)).map(
      (item) => `${item.propertyId.scope}::${item.propertyId.name}`,
    ),
  );

  // ① 先放 OVERRIDE（优先）
  for (const item of OVERRIDE_ASSIGNED_VALUES) {
    if (preserveServerAudio(item)) continue;
    const key = `${item.propertyId.scope}::${item.propertyId.name}`;

    // blacklist 直接跳过
    if (blacklistSet.has(key)) {
      n++;
      continue;
    }

    result.push(item);
    f++;
    map.set(key, true);
  }

  // ② 再补 target 里没有的
  for (const item of target) {
    const key = `${item.propertyId.scope}::${item.propertyId.name}`;

    if (blacklistSet.has(key)) {
      n++;
      continue;
    } // blacklist 过滤
    if (preserveUnspecified && !map.has(key)) {
      result.push(item);
      map.set(key, true);
      numAdded++;
    }
  }

  // ③ 覆盖回 target
  target.length = 0;
  for (const item of result) {
    target.push(item);
  }

  console.log(`完成：新增 ${numAdded} 个字段，覆盖字段 ${f}个，删去字段${n}个`);
}

function processMapObj(accountAttributesMapObj, assignedValuesMapObj) {
  //modifyAssignedValues(assignedValuesMapObj);
  overrideAssignedValues(assignedValuesMapObj);
  modifyAttributes(accountAttributesMapObj);
}

}
})();
