// Minimal Dream Journal v2 — changes per request
(function(){
  const TAGS = ["공포","연애","현실","추격","시험","가족","일/직장","모험","기이함","과거","물/바다","하늘/비행","죽음","탄생","연예인","동물","학교","돈/부자","건강","기타"];

  // Refs
  const form = document.getElementById('form');
  const titleEl = document.getElementById('title');
  const dateEl = document.getElementById('date');
  const contentEl = document.getElementById('content');
  const tagRow1 = document.getElementById('taggrid_row1');
  const tagRow2 = document.getElementById('taggrid_row2');
  const clearTagsBtn = document.getElementById('clearTags');
  const openArchiveBtn = document.getElementById('openArchive');
  const yearSpan = document.getElementById('year');

  // Result dialog refs
  const resultDlg = document.getElementById('resultDlg');
  const backToHome = document.getElementById('backToHome');
  const rTitle = document.getElementById('rTitle');
  const rDate = document.getElementById('rDate');
  const rTags = document.getElementById('rTags');
  const rExcerpt = document.getElementById('rExcerpt');
  const rMeaning = document.getElementById('rMeaning');
  const rGood = document.getElementById('rGood');
  const rBad = document.getElementById('rBad');
  const rCaution = document.getElementById('rCaution');
  const copyBtn = document.getElementById('copy');

  // Archive modal refs
  const dlg = document.getElementById('archive');
  const closeArchive = document.getElementById('closeArchive');
  const q = document.getElementById('q');
  const order = document.getElementById('order');
  const tagFilter = document.getElementById('tagFilter');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  const listEl = document.getElementById('list');
  const emptyEl = document.getElementById('empty');
  const rowTpl = document.getElementById('rowTpl');
  // Backdrop click to close dialogs
  resultDlg.addEventListener('click', (e)=>{
    const modal = resultDlg.querySelector('.modal');
    if (e.target === resultDlg) resultDlg.close();
  });
  dlg.addEventListener('click', (e)=>{
    if (e.target === dlg) dlg.close();
  });


  yearSpan.textContent = new Date().getFullYear();
  dateEl.valueAsDate = new Date();

  // Build tag chips split into 2 rows
  const selected = new Set();
  function addChip(container, t){
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='chip';
    btn.textContent=t;
    btn.dataset.tag=t;
    btn.addEventListener('click', ()=>{
      if (selected.has(t)) selected.delete(t); else selected.add(t);
      btn.classList.toggle('active');
    });
    container.appendChild(btn);
  }
  const half = Math.ceil(TAGS.length/2);
  TAGS.slice(0,half).forEach(t=> addChip(tagRow1,t));
  TAGS.slice(half).forEach(t=> addChip(tagRow2,t));
  // modal tag filter options
  TAGS.forEach(t=>{
    const opt=document.createElement('option'); opt.value=t; opt.textContent=`태그: ${t}`; tagFilter.appendChild(opt);
  });
  clearTagsBtn.addEventListener('click', ()=>{
    selected.clear();
    [...document.querySelectorAll('.chip.active')].forEach(n=>n.classList.remove('active'));
  });

  // Storage
  const KEY='dreams';
  function load(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e){ return []; } }
  function save(x){ localStorage.setItem(KEY, JSON.stringify(x)); }

  // Heuristic AI (same as before, removed "regen" feature entirely)
  function hashCode(str){ let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; } return Math.abs(h); }
  function pick(seed, arr){ return arr[ seed % arr.length ]; }
  const motifLexicon = [
    {keys:["도망","쫓기","추격","늑대","괴물","귀신","어둠","검은","폭풍"], theme:"공포/불안", meaning:"압박이나 미뤄둔 과제가 심리적 부담으로 다가오는 신호일 수 있어요."},
    {keys:["사랑","키스","연애","연인","데이트","짝사랑"], theme:"관계/애정", meaning:"감정적 연결에 대한 기대/불안이 비치는 꿈입니다."},
    {keys:["시험","지각","늦음","준비","공부","발표"], theme:"평가/성취", meaning:"능력 검증에 대한 긴장, 자기효능감 점검이 필요한 때일 수 있어요."},
    {keys:["바다","파도","물","강","호수","비","눈물"], theme:"감정/정화", meaning:"감정의 흐름이 커지는 시기. 흘려보내기와 정리가 도움이 됩니다."},
    {keys:["하늘","비행","드론","비상","낙하산","구름"], theme:"자유/확장", meaning:"관점 확장과 도전 욕구가 커집니다. 새로운 계획에 바람을 실어보세요."},
    {keys:["죽음","장례","유골","좀비"], theme:"전환/종결", meaning:"무언가의 끝과 새로운 시작. 낡은 습관을 정리할 좋은 신호예요."},
    {keys:["아기","출산","탄생"], theme:"창조/시작", meaning:"새 아이디어/프로젝트의 싹. 보살피면 크게 자랄 수 있어요."},
    {keys:["동물","강아지","고양이","곰","뱀"], theme:"본능/직감", meaning:"이성보다 감각이 앞서는 국면. 몸의 신호를 관찰해보세요."},
    {keys:["돈","지폐","금","보석"], theme:"가치/자원", meaning:"가치관 재정렬의 신호. 시간/돈의 흐름을 점검하세요."},
    {keys:["회사","직장","상사","업무","버그","배포"], theme:"일/책임", meaning:"책임과 성과 압박. 우선순위 재정립이 필요할 수 있어요."},
  ];
  const goodList = [
    "감정을 솔직히 마주하려는 용기가 커지고 있어요.",
    "새 시도를 지지하는 우연한 시그널이 곧 보일 거예요.",
    "멈춰있던 일이 작은 추진력으로 다시 굴러가기 시작합니다.",
    "가진 자원을 새롭게 조합할 아이디어가 떠오를 수 있어요.",
    "관계에서의 진심 어린 대화가 오해를 풀 수 있어요."
  ];
  const badList = [
    "한 번에 다 하려다 체력/집중이 분산될 수 있어요.",
    "과거 경험에 묶여 새로운 선택을 주저할 수 있어요.",
    "과도한 완벽주의가 진행을 늦출 수 있어요.",
    "정보 과부하로 본질을 놓칠 위험이 있어요.",
    "감정의 파고로 즉흥적 말/행동을 할 수 있어요."
  ];
  const cautionList = [
    "오늘은 일정에 ‘여유 버퍼’를 꼭 넣어 두세요.",
    "중요 연락/메시지는 한 번 더 확인하고 보내요.",
    "카페인/당분을 줄이고 수분을 충분히 섭취하세요.",
    "대화는 결론과 액션아이템을 짧게 기록하세요.",
    "과로를 피하고 7시간 이상 숙면을 우선하세요."
  ];
  
  // Warmer, human tone analyze
  function analyze(content, salt=0){
    const seed = hashCode(content + '|' + salt);
    const lower = content.toLowerCase();
    const hits = motifLexicon.filter(m => m.keys.some(k => content.includes(k) || lower.includes(k)));
    const core = hits.length ? pick(seed, hits) : pick(seed, motifLexicon);

    // Friendly templates
    const bridge = [
      "너무 걱정하지 마세요. 이미 잘하고 있고, 잠깐 숨 고르는 시간만 있어도 훨씬 편해질 거예요.",
      "혼자 다 해내려 애쓰지 않아도 괜찮아요. 필요한 만큼만 천천히 해도 충분해요.",
      "오늘은 자신에게 조금 더 다정했으면 해요. 그 마음이 좋은 변화를 데려올 거예요.",
      "괜찮아요. 느리게 가도 결국 도착해요. 마음의 속도를 먼저 맞춰줘요.",
      "지금의 감정은 잠시 들렀다 가는 구름 같아요. 곧 하늘이 다시 맑아질 거예요."
    ];
    const goodList = [
      "평소에 스쳐갔던 멋진 아이디어가 문득 떠오를 수 있어요. 떠오를 때 바로 메모해보세요.",
      "사람들과의 작은 대화에서 따뜻한 응원을 받게 될 거예요.",
      "멈춰 있던 일이 조금씩 다시 굴러가기 시작해요. 작아도 분명한 움직임이에요.",
      "내가 가진 장점을 자연스럽게 드러낼 기회가 생길 수 있어요.",
      "마음이 한결 가벼워지고, 일상이 조금 더 넓고 밝게 느껴질 거예요."
    ];
    const badList = [
      "한꺼번에 다 하려다 지칠 수 있어요. 할 일은 작게 쪼개서 순서대로 해봐요.",
      "과거의 기억이 비교로 다가와 마음을 무겁게 할 수 있어요. 지금의 나를 믿어주세요.",
      "완벽하려는 마음이 속도를 늦출 수 있어요. '충분히 괜찮음'을 허락해봐요.",
      "정보가 너무 많아 본질을 놓칠 수 있어요. 오늘의 핵심 한 가지만 정해볼까요?",
      "감정이 예민해져 순간적인 말이나 행동이 나올 수 있어요. 한 박자 쉬어가기, 잊지 않기."
    ];
    const cautionList = [
      "중요한 메시지나 약속은 한 번만 더 확인해요. 작지만 든든한 안전장치예요.",
      "일정에 작은 여유 칸을 남겨두세요. 숨 쉴 공간이 있어야 오래 달릴 수 있어요.",
      "물을 자주 마시고, 카페인은 조금만. 몸이 편해야 마음도 편해요.",
      "오늘은 나를 지키는 경계선을 분명히 해보세요. 정중하지만 단호하게요.",
      "잠들기 전 5분, 오늘 좋았던 일 한 가지만 떠올려요. 마음이 따뜻해져요."
    ];

    // Meaning text in friendly style
    const softMeaningMap = {
      "공포/불안": "요즘 마음이 조금 불안정할 수 있어요. 잘하고 싶은 마음이 큰 만큼 부담도 느껴지죠. " + pick(seed+11, bridge),
      "관계/애정": "마음이 누군가를 더 따뜻하게 바라보고 있나 봐요. 기대와 걱정이 함께 보일 수 있어요. " + pick(seed+12, bridge),
      "평가/성취": "나를 시험하는 일이 있거나 책임이 커진 때 같아요. 긴장해도 괜찮아요. " + pick(seed+13, bridge),
      "감정/정화": "마음속에 쌓인 감정이 물처럼 흘러가려는 때예요. 흘려보내면 한결 가벼워질 거예요. " + pick(seed+14, bridge),
      "자유/확장": "시야가 넓어지고 도전하고 싶은 마음이 자라나고 있어요. 작게라도 시작해보면 좋아요. " + pick(seed+15, bridge),
      "전환/종결": "무언가를 정리하고 새로 시작하려는 신호예요. 끝은 언제나 다른 시작이죠. " + pick(seed+16, bridge),
      "창조/시작": "새로운 아이디어나 계획의 씨앗이 싹트고 있어요. 천천히 돌보면 크게 자랄 거예요. " + pick(seed+17, bridge),
      "본능/직감": "머리보다 마음의 목소리가 커지는 때예요. 내 안의 감각을 믿어보세요. " + pick(seed+18, bridge),
      "가치/자원": "시간과 에너지를 어디에 쓰고 싶은지 다시 정리해보라는 신호예요. " + pick(seed+19, bridge),
      "일/책임": "해야 할 일이 많아 보이지만 우선순위를 정하면 훨씬 편해져요. " + pick(seed+20, bridge)
    };

    const meaning = softMeaningMap[core.theme] || pick(seed+21, bridge);

    return {
      theme: core.theme,
      meaning,
      good: pick(seed+1, goodList),
      bad: pick(seed+2, badList),
      caution: pick(seed+3, cautionList)
    };
  }


  // State
  let data = load();
  let last = null;

  // Submit → generate & open result popup
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const title = titleEl.value.trim();
    const date = dateEl.value || new Date().toISOString().slice(0,10);
    const content = contentEl.value.trim();
    if(!title || !content){ alert('제목과 내용을 입력하세요.'); return; }
    const tags = selected.size ? [...selected] : ['기타'];
    const analysis = analyze(content);
    const row = { id: Date.now(), title, date, content, tags, analysis };
    data.unshift(row); save(data);
    last = row;
    paint(row);
    resultDlg.showModal();
    form.reset();
    dateEl.valueAsDate = new Date();
    clearTagsBtn.click();
  });

  function paint(r){
    rTitle.textContent = r.title;
    rDate.textContent = r.date;
    rTags.textContent = r.tags.join(', ');
    rExcerpt.textContent = r.content.length>160 ? r.content.slice(0,160)+'…' : r.content;
    rMeaning.textContent = r.analysis.meaning;
    rGood.textContent = r.analysis.good;
    rBad.textContent = r.analysis.bad;
    rCaution.textContent = r.analysis.caution;
  }

  // Back & copy
  backToHome.addEventListener('click', ()=> resultDlg.close());
  
  copyBtn.addEventListener('click', ()=>{
    if(!last) return;
    const a = last.analysis;
    const lines = [
      `제목: ${last.title}`,
      `날짜: ${last.date}`,
      `태그: ${last.tags.join(', ')}`,
      ``,
      `해몽 요약: ${a.meaning}`,
      `좋은 점: ${a.good}`,
      `안좋은 점: ${a.bad}`,
      `오늘 조심할 점: ${a.caution}`,
    ];
    const text = lines.join('\n'); // 실제 줄바꿈
    navigator.clipboard.writeText(text).then(()=> alert('복사되었습니다.'));
  });


  // Archive modal
  openArchiveBtn.addEventListener('click', ()=>{ dlg.showModal(); drawList(); });
  closeArchive.addEventListener('click', ()=> dlg.close());
  q.addEventListener('input', drawList);
  order.addEventListener('change', drawList);
  tagFilter.addEventListener('change', drawList);
  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dreams_backup.json'; a.click();
    URL.revokeObjectURL(url);
  });
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', ()=>{
    const f = importFile.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      try{
        const incoming = JSON.parse(r.result);
        if(!Array.isArray(incoming)) throw new Error();
        const byId = new Map(data.map(d=>[d.id,d]));
        incoming.forEach(x=>{ if(!byId.has(x.id)) data.push(x); });
        save(data); drawList(); alert('가져오기 완료');
      }catch{ alert('가져오기 실패: JSON 형식 확인'); }
      importFile.value='';
    };
    r.readAsText(f, 'utf-8');
  });

  function drawList(){
    let rows = data.slice();
    const term = (q.value||'').toLowerCase().trim();
    const tf = tagFilter.value;
    if(term){
      rows = rows.filter(r=> (r.title+' '+r.content+' '+r.tags.join(' ')).toLowerCase().includes(term));
    }
    if(tf !== 'all'){
      rows = rows.filter(r => r.tags.includes(tf));
    }
    const ord = order.value;
    rows.sort((a,b)=>{
      if(ord==='date_desc') return (b.date||'').localeCompare(a.date||'');
      if(ord==='date_asc') return (a.date||'').localeCompare(b.date||'');
      if(ord==='title_asc') return (a.title||'').localeCompare(b.title||'');
      if(ord==='title_desc') return (b.title||'').localeCompare(a.title||'');
      return 0;
    });

    listEl.innerHTML='';
    if(!rows.length){ emptyEl.style.display='block'; return; } else { emptyEl.style.display='none'; }

    rows.forEach(r=>{
      const node = rowTpl.content.cloneNode(true);
      node.querySelector('.row-title').textContent = r.title;
      node.querySelector('.row-meta').textContent = `${r.date} · ${r.tags.join(', ')}`;
      node.querySelector('.view').addEventListener('click', ()=>{ last = r; paint(r); resultDlg.showModal(); });
      node.querySelector('.del').addEventListener('click', ()=>{
        if(!confirm('삭제할까요?')) return;
        const pos = data.findIndex(x=>x.id===r.id);
        if(pos>=0){ data.splice(pos,1); save(data); drawList(); }
      });
      listEl.appendChild(node);
    });
  }

  // Seed demo if empty; do NOT auto-show any result on first screen
  if(!load().length){
    const demo = {
      id: Date.now(),
      title:"어두운 숲에서 누군가에게 쫓기는 꿈",
      date:new Date().toISOString().slice(0,10),
      content:"깊은 밤 숲속에서 발소리가 따라오고, 폭풍우가 몰아치며 길을 잃었다. 나를 쫓는 그림자와 어두움이 짙었다.",
      tags:["공포","추격","기이함"],
      analysis: analyze("깊은 밤 숲속에서 발소리가 따라오고, 폭풍우가 몰아치며 길을 잃었다. 나를 쫓는 그림자와 어두움이 짙었다.")
    };
    const tmp = load(); tmp.unshift(demo); save(tmp);
  }

})();