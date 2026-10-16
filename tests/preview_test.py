"""Standalone HTML preview smoke check, including its actual CSP hash policy.
Uses an offline document and an in-memory localStorage replacement; not Android.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json
ROOT=Path(__file__).resolve().parents[1]
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':412,'height':915})
    page.evaluate('''() => {
      const data={}; Object.defineProperty(window,'localStorage',{value:{
      getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}});
    }''')
    page.set_content((ROOT/'preview/Laedle-preview.html').read_text())
    page.wait_for_function('window.LadleAppReady === true')
    expect(page.locator('h1')).to_have_text('Willkommen im Lädle')
    results.append('standalone HTML runs its packaged scripts under the actual hash CSP')
    assert page.locator('body').evaluate('(el)=>getComputedStyle(el).backgroundColor')=='rgb(237, 241, 244)'
    results.append('standalone hash-authorized stylesheet is applied')
    page.evaluate('''() => {const s=document.createElement('script');s.textContent='window.UNAUTHORIZED=true';document.body.appendChild(s)}''')
    assert not page.evaluate('Boolean(window.UNAUTHORIZED)')
    results.append('standalone CSP refuses an added unauthorized inline script')
    for _ in range(3):page.get_by_test_id('wizard-next').click()
    expect(page.locator('[data-action="new-event"]')).to_be_visible()
    results.append('standalone preview completes the setup wizard')
    browser.close()
report={'passed':len(results),'checks':results,'mode':'standalone HTML / actual hash CSP / memory storage / desktop Chromium'}
(ROOT/'reports/preview-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
