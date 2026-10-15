import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {ContentProjectSchema} from '../packages/schema/src/content.schema.ts';
import {assertScriptReady} from '../packages/orchestration/src/prepare.ts';

const root=path.resolve(import.meta.dirname,'..');
const dossier=JSON.parse(await readFile(path.join(root,
  'examples/china-japan-ev-2025-dossier-reviewed.json'),'utf8'));
const templates={short:JSON.parse(await readFile(path.join(root,'examples/japan-china-map.json'),'utf8')),
  long:JSON.parse(await readFile(path.join(root,'examples/japan-china-wide.json'),'utf8'))};
const short=[
  {title:'Hai thị trường, cùng một thước đo',style:'D',card:['Xe điện là gì?','BEV + PHEV','IEA, Global EV Outlook 2026'],
    facts:['definition-iea-electric-car','definition-hev-separate','china-sales-2025','japan-sales-2025'],
    text:`Khi nói Trung Quốc và Nhật Bản đi hai con đường xe điện, trước tiên phải dùng cùng một thước đo. Trong báo cáo của IEA, xe điện ở đây gồm xe chạy pin hoàn toàn và hybrid có thể sạc ngoài. Hybrid thông thường được tính riêng. Theo thước đo đó, năm 2025 Trung Quốc bán hơn mười ba triệu xe điện, còn Nhật Bản chỉ nhỉnh hơn một trăm nghìn chiếc. Hai con số cho thấy quy mô thị trường khác xa nhau, nhưng không tự chứng minh hãng xe nào tốt hơn, hay nước nào sẽ thắng trong tương lai. Ta cần nhìn tiếp vào tỷ trọng trong toàn bộ ô tô mới bán ra, rồi mới hiểu mỗi thị trường đang ở đâu.`},
  {title:'Trung Quốc tăng nhanh, Nhật Bản ưu tiên hybrid',style:'D',card:['Thị phần 2025','Trung Quốc gần 55% · Nhật dưới 3%','IEA, Global EV Outlook 2026'],
    facts:['china-share-2025','japan-share-2025','japan-hev-share-2025','japan-jama-intent-2025'],
    text:`Ở Trung Quốc, xe điện chiếm gần năm mươi lăm phần trăm doanh số ô tô mới trong năm 2025. Tại Nhật Bản, tỷ trọng này dưới ba phần trăm, trong khi hybrid thông thường chiếm khoảng một phần ba. Khác biệt này không có nghĩa người Nhật hoàn toàn quay lưng với điện hóa. Khảo sát JAMA về chiếc xe dự định mua tiếp theo cho thấy bốn mươi sáu phần trăm người trả lời cân nhắc nhóm xe điện hóa, nhưng nhóm ấy bao gồm cả hybrid không sạc ngoài. Đây là ý định trong khảo sát, không phải số xe đã bán. Nếu đặt số NEV của Trung Quốc cạnh số xe điện của IEA mà không giải thích định nghĩa, ta sẽ kể sai câu chuyện. So sánh đúng bắt đầu từ việc giữ rõ tên từng chỉ tiêu.`}
];
const long=[
  {title:'Câu hỏi và thước đo',style:'A',card:null,
    facts:['definition-iea-electric-car','definition-hev-separate','china-sales-2025','japan-sales-2025'],
    text:`Cùng nói về xe điện, nhưng Trung Quốc và Nhật Bản đang hiện ra như hai thị trường rất khác nhau. Để hiểu khác biệt ấy, chúng ta bắt đầu bằng một câu hỏi đơn giản: xe nào được tính là xe điện? Trong Global EV Outlook 2026, IEA dùng nhóm electric cars cho xe chạy pin hoàn toàn và xe hybrid có thể sạc từ bên ngoài. Xe hybrid thông thường, loại tự tạo điện trong khi chạy và không cắm sạc, được trình bày tách riêng. Đây là ranh giới quan trọng của toàn bộ video. Nếu gộp hybrid thông thường vào doanh số xe điện ở Nhật, rồi so với một con số không gộp loại đó ở Trung Quốc, biểu đồ sẽ gây hiểu lầm ngay từ phút đầu. Theo cùng định nghĩa IEA, trong năm 2025 Trung Quốc bán hơn mười ba triệu xe điện; Nhật Bản chỉ nhỉnh hơn một trăm nghìn. Chênh lệch quy mô là rõ, nhưng nó chưa trả lời vì sao mỗi thị trường như vậy. Các phần sau sẽ lần lượt nhìn vào doanh số, cách sản xuất, chi phí và khảo sát người mua. Chúng ta sẽ giữ giới hạn: không suy ra tương lai của từng hãng chỉ từ vài chỉ tiêu của một năm.`},
  {title:'Bức tranh thế giới năm 2025',style:'D',card:['Toàn cầu','Hơn 20 triệu xe điện','IEA, Global EV Outlook 2026'],
    facts:['global-sales-2025','china-sales-2025','china-share-2025'],
    text:`Năm 2025, theo IEA, doanh số xe điện trên toàn thế giới vượt hai mươi triệu chiếc. Cụm từ vượt hai mươi triệu là một mốc dưới, không phải một số chính xác đến từng chiếc. Trong bức tranh ấy, Trung Quốc là thị trường rất lớn: hơn mười ba triệu xe điện được bán tại đây. Gần năm mươi lăm phần trăm ô tô mới bán ở Trung Quốc thuộc nhóm xe điện theo định nghĩa vừa nêu. Hai cách nhìn này bổ sung cho nhau. Doanh số tuyệt đối cho biết quy mô của thị trường. Tỷ trọng trong tổng xe mới cho biết xe điện đã hiện diện nhiều đến mức nào trong lựa chọn mua ô tô. Khi một thị trường vừa có lượng bán lớn vừa có tỷ trọng cao, nó tạo nền cho sản xuất ở quy mô lớn và cho các chuỗi cung ứng phục vụ loại xe ấy. Đó là một cách diễn giải hợp lý từ dữ liệu, không phải phép đo trực tiếp về lợi nhuận của từng công ty. Điều ta có thể khẳng định là mức độ phổ biến trong doanh số mới của Trung Quốc năm 2025 rất cao so với Nhật Bản, khi dùng cùng thước đo IEA.`},
  {title:'Trung Quốc: lớn nhưng tăng trưởng chậm lại',style:'D',card:['Trung Quốc 2025','Gần 55% xe mới là xe điện','IEA, Global EV Outlook 2026'],
    facts:['china-sales-2025','china-share-2025','china-growth-2025','china-stock-2025'],
    text:`Ở Trung Quốc, hơn mười ba triệu xe điện bán trong năm 2025 không có nghĩa thị trường luôn tăng với cùng một tốc độ. IEA cho biết tốc độ tăng doanh số năm này dưới hai mươi phần trăm so với năm trước. Đây vẫn là tăng trưởng, chỉ là nhịp tăng thấp hơn giai đoạn trước. Xe điện chiếm gần năm mươi lăm phần trăm ô tô mới, còn số xe điện đang lưu hành trên đường được IEA ước tính khoảng bốn mươi bốn triệu vào cuối năm. Cần phân biệt ba lớp số liệu: xe bán trong một năm, tỷ lệ xe điện trong doanh số mới, và số xe còn đang chạy. Một chiếc xe đã bán các năm trước góp vào lượng lưu hành nhưng không được cộng lại vào doanh số năm 2025. Ngược lại, tỷ trọng doanh số mới có thể lên cao khá nhanh trong khi cả đội xe ngoài đường cần nhiều năm để thay đổi. Khi trình bày trên màn hình, mỗi lớp dữ liệu sẽ có nhãn riêng. Phần này mô tả diễn biến của thị trường, không kết luận mọi người mua xe Trung Quốc đều muốn cùng một loại xe.`},
  {title:'Nhật Bản: một cấu trúc khác',style:'D',card:['Nhật Bản 2025','Xe điện dưới 3%','IEA, Global EV Outlook 2026'],
    facts:['japan-sales-2025','japan-share-2025','japan-hev-share-2025','japan-hybrid-focus'],
    text:`Nhật Bản cho thấy một cấu trúc khác. IEA ước lượng doanh số xe điện năm 2025 chỉ nhỉnh hơn một trăm nghìn chiếc và tỷ trọng dưới ba phần trăm trong ô tô mới. Cùng lúc, hybrid thông thường chiếm khoảng một phần ba doanh số ô tô. Hybrid loại này vẫn dùng động cơ xăng, nhưng kết hợp mô tơ điện và không cần cắm sạc ngoài. Vì thế, không thể lấy tỷ trọng hybrid để gọi là tỷ trọng xe điện theo định nghĩa IEA. IEA liên hệ vai trò lớn của hybrid với chiến lược lâu dài của các hãng Nhật nhằm đáp ứng yêu cầu tiết kiệm nhiên liệu. Đó là một diễn giải của IEA, không phải lời giải thích duy nhất cho quyết định của tất cả người mua. Nếu chỉ nhìn một con số dưới ba phần trăm, ta dễ kết luận quá nhanh rằng điện hóa không quan trọng ở Nhật. Thực tế, câu hỏi phù hợp hơn là công nghệ điện hóa nào đang chiếm vai trò lớn trong doanh số. Với bộ số liệu này, câu trả lời rõ nhất là hybrid thông thường, trong khi BEV và PHEV vẫn là nhóm nhỏ.`},
  {title:'Vì sao hai con số Trung Quốc khác nhau?',style:'D',card:['Hai chỉ tiêu khác nhau','IEA electric cars · CAAM NEV','IEA / CAAM, 2025'],
    facts:['definition-iea-electric-car','china-sales-2025','china-caam-nev-sales-2025'],
    text:`Có thể bạn đã thấy một số khác về Trung Quốc: CAAM báo cáo bán mười sáu phẩy bốn chín triệu xe năng lượng mới trong năm 2025. Con số ấy không giống mốc hơn mười ba triệu xe điện của IEA. Không nên chọn một trong hai rồi tuyên bố nguồn kia sai. Trước hết, chúng mang tên chỉ tiêu khác nhau: CAAM nói new energy vehicles, còn IEA nói electric cars và nêu rõ nhóm xe chạy pin cùng hybrid sạc ngoài. Phạm vi phương tiện, khâu ghi nhận và phương pháp của các nguồn cần được đối chiếu trước khi tính một mức chênh lệch. Trong video này, biểu đồ so sánh Trung Quốc với Nhật Bản chỉ dùng chỉ tiêu electric cars của IEA cho cả hai nước. Số CAAM được nhắc riêng như một thống kê do hiệp hội ngành xe Trung Quốc công bố, không được dùng để tính tỷ lệ với số Nhật của IEA. Đây là ví dụ về một nguyên tắc đơn giản khi đọc kinh tế: trước khi so hai con số, hãy đọc tên và phạm vi đo của chúng. Cùng nói về xe, nhưng không nhất thiết cùng đo một thứ.`},
  {title:'Từ doanh số sang nhà máy và xuất khẩu',style:'D',card:['Trung Quốc sản xuất','Khoảng 16 triệu xe điện','IEA, Manufacturing and trade'],
    facts:['china-production-2025','china-exports-2025','china-sales-2025'],
    text:`Bức tranh thị trường chưa phải toàn bộ câu chuyện. Theo IEA, Trung Quốc sản xuất khoảng mười sáu triệu xe điện trong năm 2025 và xuất khẩu hơn hai phẩy năm triệu chiếc. Sản lượng nhà máy là số xe được chế tạo. Doanh số nội địa là số xe được bán trong thị trường Trung Quốc. Xuất khẩu là số xe rời Trung Quốc, nhưng thời điểm xuất khẩu không nhất thiết trùng thời điểm người mua ở nước ngoài nhận xe. Vì vậy, không cộng hoặc trừ các mốc ấy một cách tùy tiện để tạo ra một kết luận về hàng tồn kho. Điều rõ hơn là quy mô sản xuất đã vượt nhu cầu nội địa theo phân tích IEA, và xuất khẩu trở thành một phần quan trọng của hoạt động ngành xe điện. Khả năng sản xuất nhiều xe giúp duy trì chuỗi cung ứng, nhưng bản thân khối lượng sản xuất không cho ta biết biên lợi nhuận hay chất lượng của từng mẫu. Khi minh họa trên bản đồ, mũi tên xuất khẩu chỉ là ký hiệu luồng thương mại; nó không đại diện cho một tuyến hàng cụ thể. Mục tiêu của phần này là phân biệt ba khái niệm thường bị trộn lẫn trên các tiêu đề tin tức.`},
  {title:'Pin và vị trí trong chuỗi cung ứng',style:'C',card:null,
    facts:['china-battery-share-2025','china-battery-efficiency-gap','china-lfp-cost'],
    text:`Một chiếc xe điện gắn với cả chuỗi cung ứng pin, chứ không chỉ nhà máy lắp ráp xe. IEA cho biết Trung Quốc chiếm hơn tám mươi phần trăm sản lượng cell pin xe điện toàn cầu trong năm 2025. Cell là phần lõi của bộ pin; sản lượng cell không phải doanh số xe. Trong tài liệu phân tích chi phí, IEA còn ước tính hiệu quả sản xuất giải thích hơn bốn mươi phần trăm khoảng cách chi phí làm pin giữa Trung Quốc và châu Âu. Phép so này là với châu Âu, không phải với Nhật Bản. IEA cũng nêu việc dùng rộng rãi hóa học lithium sắt phosphate, thường viết tắt là LFP, như một yếu tố giúp giảm chi phí vật liệu ở Trung Quốc. Ta không thể từ đó kết luận tất cả xe điện Trung Quốc cùng dùng một loại pin, hay mọi xe Nhật có pin đắt hơn. Phần đáng chú ý là quy mô, kinh nghiệm vận hành nhà máy và lựa chọn hóa học pin cùng ảnh hưởng đến giá thành. Khi chuyển thông tin này thành hình, chúng ta ghi rõ nhãn sản lượng cell và tránh biến một chỉ số của pin thành một chỉ số của ô tô.`},
  {title:'Giá thành không chỉ là trợ cấp',style:'D',card:['Chi phí sản xuất','Quy mô · pin · kinh nghiệm','IEA, Cutting through the noise'],
    facts:['china-scale-cost','china-battery-cost','china-lfp-cost','china-policy-scale'],
    text:`Vì sao IEA nói xe điện sản xuất ở Trung Quốc có lợi thế chi phí? Tài liệu phân tích của cơ quan này đặt một phần câu trả lời ở quy mô nhà máy: khi sản lượng lớn, chi phí cố định được chia cho nhiều xe hơn. Phần tiếp theo nằm ở pin, vì chi phí pin thấp hơn làm lợi thế sản xuất xe điện lớn hơn lợi thế đã có ở xe động cơ đốt trong. Việc dùng LFP rộng rãi cũng góp phần giảm nhu cầu vật liệu đắt hơn. IEA đồng thời đánh giá trợ cấp và nguồn vốn ưu đãi trong giai đoạn đầu đã giúp các nhà sản xuất mở rộng quy mô, nhưng không đủ để một mình giải thích chênh lệch giá về sau. Đây là các yếu tố trong phân tích chi phí sản xuất, không phải bảng giá bán lẻ của từng mẫu xe. Thuế, trang bị, kênh phân phối hay thị trường nhận xe có thể khiến giá người mua thấy khác với chi phí xuất xưởng. Video này vì vậy chỉ nói về các cơ chế được IEA nêu, không gắn nhãn mọi xe Trung Quốc là rẻ hơn mọi xe Nhật.`},
  {title:'Người mua Nhật Bản đang cân nhắc gì?',style:'D',card:['Khảo sát JAMA','46% cân nhắc xe điện hóa','JAMA, khảo sát 2025'],
    facts:['japan-jama-intent-2025','japan-jama-hev-preference','japan-jama-bev-concerns','japan-jama-home-charging','japan-charging-constraint'],
    text:`Bên cạnh doanh số đã xảy ra, một khảo sát có thể cho thấy người mua đang nghĩ gì. JAMA báo cáo bốn mươi sáu phần trăm người trả lời cân nhắc nhóm xe điện hóa cho chiếc xe tiếp theo. Nhóm này gồm hybrid thông thường, hybrid sạc ngoài, xe chạy pin và cả xe pin nhiên liệu. Vì vậy, bốn mươi sáu phần trăm không phải tỷ trọng người định mua xe thuần điện, càng không phải doanh số xe điện đã bán. Trong khảo sát, hybrid thông thường đứng đầu khi người trả lời xếp thứ tự ưu tiên xe thân thiện môi trường; BEV được nêu với nhiều mối lo hơn các nhóm khác. JAMA cũng cho biết trong nhóm người dùng BEV hoặc PHEV ở nhà riêng, việc sạc tại nhà giữ vai trò chính. IEA bổ sung rằng khả năng đỗ xe riêng và hạ tầng sạc là các hạn chế đối với doanh số xe điện tại Nhật. Các kết quả này giúp giải thích bối cảnh lựa chọn, nhưng không đo chính xác mỗi yếu tố làm giảm bao nhiêu chiếc xe bán ra. Ta nên đọc khảo sát như ý kiến của nhóm được hỏi, rồi đặt cạnh số doanh số thực tế.`},
  {title:'Kết luận có giới hạn',style:'A',card:null,
    facts:['china-share-2025','japan-share-2025','japan-hev-share-2025','china-production-2025','japan-jama-intent-2025'],
    text:`Sau tất cả, sự khác biệt quan trọng nhất trong dữ liệu năm 2025 là mức độ phổ biến của xe điện sạc ngoài. Theo cùng định nghĩa IEA, nhóm xe này gần năm mươi lăm phần trăm doanh số ô tô mới ở Trung Quốc, nhưng dưới ba phần trăm ở Nhật Bản. Nhật Bản lại có hybrid thông thường ở khoảng một phần ba doanh số. Trung Quốc không chỉ là nơi tiêu thụ lớn mà còn sản xuất khoảng mười sáu triệu xe điện theo IEA. Khảo sát JAMA cho thấy sự quan tâm tới điện hóa ở Nhật rộng hơn doanh số BEV và PHEV, nhưng không cho phép đổi ý định thành số xe đã bán. Những nhận định ấy mô tả thị trường và chuỗi sản xuất của một năm, chưa chứng minh hãng nào sẽ dẫn đầu trong thập kỷ tới. Khi xem các con số khác từ báo chí, hãy hỏi ba điều: đây là xe thuần điện, hybrid sạc ngoài hay cả hybrid thông thường; đây là sản xuất, xuất khẩu hay bán lẻ; và đây là số liệu thực tế hay ý định khảo sát. Trả lời đúng ba câu hỏi đó giúp chúng ta đọc cuộc đua xe điện tỉnh táo hơn.`}
];

function makeScene(template,item,kind,index,seconds){
  const scene=structuredClone(template.scenes[0]);
  scene.id=`${kind}-scene-${index+1}`;scene.startFrame=index*seconds*30;
  scene.durationFrames=seconds*30;scene.title=item.title;
  scene.labels=[];scene.routes=[];scene.subtitles=[];
  scene.cards=item.card?[{heading:item.card[0],value:item.card[1],source:item.card[2]}]:[];
  scene.transitionOut=index===(kind==='short'?short:long).length-1?'cut':'fade';
  if(item.style==='C'){
    scene.stylePreset='C';scene.variant='country-prism';
    scene.regions=[{featureId:'CHN',fill:'#38C8ED',effect:'rise',extrudeMeters:120000}];
  }else if(item.style==='A'){
    scene.stylePreset='A';scene.variant='cinematic-duel';
    scene.regions=[{featureId:'CHN',fill:'#38C8ED',effect:'solid'},
      {featureId:'JPN',fill:'#F43F6E',effect:'pulse'}];
  }else{
    scene.stylePreset='D';scene.variant=item.card?'editorial-card':'split-comparison';
    scene.regions=[{featureId:'CHN',fill:'#38C8ED',effect:'solid'},
      {featureId:'JPN',fill:'#F43F6E',effect:'solid'}];
  }
  return scene;
}
function edition(kind,items,template,seconds){
  const total=items.length*seconds;
  return {kind,title:kind==='short'?'Xe điện Trung Quốc và Nhật Bản: hai thị trường năm 2025':
    'Xe điện Trung Quốc và Nhật Bản: thị trường, sản xuất và lựa chọn người mua',
  durationTargetSeconds:total,
  output:{width:kind==='short'?1080:1920,height:kind==='short'?1920:1080,
    fps:30,format:'mp4',codec:'h264',filename:`china_japan_ev_2025_${kind}_${kind==='short'?'9x16':'16x9'}.mp4`},
  hook:items[0].text.split('.')[0]+'.',
  outline:(kind==='short'?[{name:'Cùng một thước đo',count:1},{name:'Hai cấu trúc thị trường',count:1}]:
    [{name:'Định nghĩa và doanh số',count:4},{name:'Sản xuất và chi phí',count:4},{name:'Người mua và kết luận',count:2}])
    .map((part,index)=>({chapterId:`${kind}-chapter-${index+1}`,name:part.name,
      goal:'Giải thích dữ kiện và giới hạn suy luận từ nguồn đã dẫn',targetSeconds:part.count*seconds})),
  script:items.map((item,index)=>({segmentId:`${kind}-segment-${index+1}`,
    narration:item.text,factRefs:item.facts,targetSeconds:seconds})),
  scenes:items.map((item,index)=>makeScene(template,item,kind,index,seconds)),
  voice:{provider:'local',voiceId:'Linh',assetPath:`outputs/speech/china-japan-ev-2025/${kind}/voice.wav`,
    rights:{license:'macOS built-in voice, local project use',attribution:'Voice generated locally with Apple Linh'}},
  captions:{enabled:false,language:'vi-VN',formats:['srt','ass']}};
}
const content={schemaVersion:'1.1',projectId:dossier.projectId,
  topic:'Xe điện Trung Quốc và Nhật Bản: thị trường năm 2025',locale:'vi-VN',
  research:{sources:dossier.sources.map(source=>({id:source.id,url:source.url,
    fileRef:source.localPath,title:source.title,license:source.license,
    retrievedAt:source.retrievedAt})),
    facts:dossier.claims.filter(claim=>claim.approval==='approved').map(claim=>({
      id:claim.id,statement:claim.text,sourceIds:claim.sourceIds}))},
  narrative:{thesis:'Năm 2025, Trung Quốc và Nhật Bản có mức phổ biến xe điện sạc ngoài rất khác nhau; định nghĩa và loại chỉ tiêu quyết định cách hiểu.',
    keyPoints:['So sánh BEV+PHEV theo IEA','Phân biệt doanh số, sản xuất và xuất khẩu',
      'Đọc khảo sát JAMA như ý định, không phải doanh số'],
    exclusions:['Không xếp hạng hãng xe','Không dự báo tương lai','Không dùng đồ họa CAAM hoặc JAMA']},
  production:{mode:'review_before_render',defaultTheme:'midnight-blue',
    mixStyles:['A','C','D'],seed:2025},
  editions:{short:edition('short',short,templates.short,45),
    long:edition('long',long,templates.long,90)}};
ContentProjectSchema.parse(content);
assertScriptReady(content,dossier);
const file=path.join(root,'examples/china-japan-ev-2025-content.json');
await writeFile(file,JSON.stringify(content,null,2)+'\n');
for(const kind of ['short','long']) {
  const edition=content.editions[kind],manifest={provider:'macos_say',voiceId:'Linh',
    rateWpm:kind==='short'?170:130,targetSeconds:edition.durationTargetSeconds,
    output:{width:edition.output.width,height:edition.output.height},rights:edition.voice.rights,
    segments:edition.script.map(item=>({id:item.segmentId,text:item.narration,
      targetSeconds:item.targetSeconds}))};
  await writeFile(path.join(root,`examples/china-japan-ev-2025-speech-${kind}.json`),
    JSON.stringify(manifest,null,2)+'\n');
}
console.log(JSON.stringify({status:'ready_for_review',file:path.relative(root,file),
  segments:{short:short.length,long:long.length},
  words:Object.fromEntries(['short','long'].map(kind=>[kind,
    [...new Intl.Segmenter('vi-VN',{granularity:'word'}).segment(
      content.editions[kind].script.map(item=>item.narration).join(' '))]
      .filter(item=>item.isWordLike).length]))},null,2));
