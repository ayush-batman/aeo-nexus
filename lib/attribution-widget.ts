export function attributionWidgetCode(origin: string, workspaceId: string, token: string): string {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || !/^[a-f0-9-]{36}$/i.test(workspaceId) || !/^v1\.[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid widget configuration');
  const config = JSON.stringify({ endpoint: new URL('/api/attribution/survey', url).href, workspaceId, ingestToken: token }).replace(/</g, '\\u003c');
  return `<!-- Aelo survey: install once on your own website -->
<script>
(function() {
  if (document.getElementById('aelo-attribution')) return;
  var config = ${config};
  var panel = document.createElement('section');
  panel.id = 'aelo-attribution';
  panel.setAttribute('aria-label', 'How did you find us?');
  panel.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;max-width:300px;padding:20px;background:#171717;color:#fafafa;border:1px solid #777;font:14px system-ui;';
  var heading = document.createElement('p'); heading.textContent = 'How did you find us?'; panel.appendChild(heading);
  var status = document.createElement('p'); status.setAttribute('role','status');
  var options = [['chatgpt','ChatGPT'],['gemini','Gemini'],['perplexity','Perplexity'],['ai_assistant','Other AI'],['google_search','Google Search'],['social_media','Social Media'],['referral','Friend or colleague'],['other','Other']];
  options.forEach(function(option) {
    var button = document.createElement('button'); button.type='button'; button.textContent=option[1];
    button.style.cssText='display:block;width:100%;min-height:44px;margin-top:6px;background:#fafafa;color:#171717;border:1px solid #777;cursor:pointer;';
    button.onclick=async function() {
      var buttons=panel.querySelectorAll('button'); buttons.forEach(function(b){b.disabled=true;});
      status.textContent='Saving…';
      try {
        var response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspaceId:config.workspaceId,ingestToken:config.ingestToken,source:option[0]})});
        if(!response.ok) throw new Error('not saved');
        status.textContent='Thanks! Your response was saved.';
        setTimeout(function(){panel.remove();},2000);
      } catch(error) {status.textContent='Could not save. Please try again.';buttons.forEach(function(b){b.disabled=false;});}
    };
    panel.appendChild(button);
  });
  panel.appendChild(status);document.body.appendChild(panel);
})();
</script>`;
}
