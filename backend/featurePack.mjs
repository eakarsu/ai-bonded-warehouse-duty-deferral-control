// Deterministic offline feature pack: search/filter, export, insights over own records. No provider calls.
export function filterRecords(rows,{q="",status="",risk=""}={}){
  const needle=String(q).trim().toLowerCase();
  return (rows||[]).filter(r=>{
    if(status && r.status!==status) return false;
    if(risk && r.risk!==risk) return false;
    if(!needle) return true;
    const hay=[r.reference,r.title,r.status,r.owner,r.risk,JSON.stringify(r.payload||{})].join(" ").toLowerCase();
    return hay.includes(needle);
  });
}
export function recordsToCsv(rows){
  const cols=["id","reference","title","status","owner","risk","due_date","amount"];
  const esc=v=>{let s=v==null?"":String(v); if(/^[=+\-@]/.test(s)) s="'"+s; return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  return [cols.join(","),...(rows||[]).map(r=>cols.map(c=>esc(c==="due_date"?String(r.due_date??"").slice(0,10):r[c])).join(","))].join("\n")+"\n";
}
export function buildInsights(feature,rows){
  const items=rows||[]; const total=items.length;
  const high=items.filter(r=>["High","Critical"].includes(r.risk)).length;
  const open=items.filter(r=>!["Approved","Closed"].includes(r.status)).length;
  const value=items.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const overdue=items.filter(r=>r.due_date && new Date(r.due_date).getTime()<Date.now() && !["Approved","Closed"].includes(r.status)).length;
  const incomplete=items.filter(r=>String(r.payload?.evidenceState||"")==="Incomplete").length;
  return {aiGenerated:false,source:"deterministic-offline",label:"Offline deterministic insights (not AI-generated)",feature:feature.id,
    sections:[
      {title:"Queue summary",detail:`${total} records: ${open} open, ${high} high-risk, ${overdue} overdue.`,metrics:{total,open,highRisk:high,overdue,hasHighRisk:high>0,hasOverdue:overdue>0}},
      {title:"Value summary",detail:`Represented value ${value}. Average ${total?Math.round(value/total*100)/100:0}.`,metrics:{totalValue:value,averageValue:total?Math.round(value/total*100)/100:0,isEmpty:total===0}},
      {title:"Evidence summary",detail:`${incomplete} records with incomplete evidence. Review flagged records before closure.`,metrics:{incompleteEvidence:incomplete,completeEvidence:total-incomplete,needsReview:incomplete>0}}
    ],
    insights:[
      {id:"queue",title:`${feature.title} queue`,value:open},
      {id:"risk",title:`${feature.title} risk`,value:high},
      {id:"evidence",title:`${feature.title} evidence gaps`,value:incomplete}
    ]};
}
