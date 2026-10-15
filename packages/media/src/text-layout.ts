export type TextBox = {
  name:string;
  left:number;top:number;right:number;bottom:number;
  contentWidth:number;clientWidth:number;
  contentHeight:number;clientHeight:number;
};

export function textLayoutIssues(boxes:readonly TextBox[],width:number,height:number):string[] {
  const tolerance=1;
  return boxes.flatMap(box=>{
    const outside=box.left < -tolerance || box.top < -tolerance ||
      box.right > width+tolerance || box.bottom > height+tolerance;
    const clipped=box.contentWidth > box.clientWidth+tolerance ||
      box.contentHeight > box.clientHeight+tolerance;
    return outside||clipped?[`${box.name}:${outside?'outside':'clipped'}`]:[];
  });
}
