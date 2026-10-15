import {PNG} from 'pngjs';

export function blendPng(firstBytes,secondBytes,secondAlpha) {
  if(!Number.isFinite(secondAlpha)||secondAlpha<0||secondAlpha>1)
    throw new Error('INVALID_BLEND_ALPHA');
  const first=PNG.sync.read(firstBytes),second=PNG.sync.read(secondBytes);
  if(first.width!==second.width||first.height!==second.height)
    throw new Error('BLEND_SIZE_MISMATCH');
  const output=new PNG({width:first.width,height:first.height});
  for(let i=0;i<output.data.length;i+=4) {
    for(let channel=0;channel<3;channel++)
      output.data[i+channel]=Math.round(first.data[i+channel]*(1-secondAlpha)+
        second.data[i+channel]*secondAlpha);
    output.data[i+3]=255;
  }
  return PNG.sync.write(output);
}

// Fade to the page's dark map backdrop so titles from adjacent scenes never overlap.
export function dimPng(bytes,opacity) {
  if(!Number.isFinite(opacity)||opacity<0||opacity>1) throw new Error('INVALID_FADE_OPACITY');
  const source=PNG.sync.read(bytes);
  const output=new PNG({width:source.width,height:source.height});
  const backdrop=[3,13,27];
  for(let i=0;i<output.data.length;i+=4) {
    for(let channel=0;channel<3;channel++)
      output.data[i+channel]=Math.round(source.data[i+channel]*opacity+backdrop[channel]*(1-opacity));
    output.data[i+3]=255;
  }
  return PNG.sync.write(output);
}
