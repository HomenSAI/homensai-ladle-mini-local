"""Execute the packaged single-file preview with actual hash CSP, memory storage.
This runs desktop Chromium at Android-like viewport sizes, NOT Android/WebView.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, traceback, re
R=Path(__file__).resolve().parents[1]; results=[];errors=[];fatal_error=None
def check(name,fn):
    try: fn();results.append({'name':name,'status':'passed'});print('PASS',name,flush=True)
    except Exception as ex:results.append({'name':name,'status':'failed','error':str(ex)});raise
def eq(a,b):assert a==b,(a,b)
def click(name):page.locator('[data-action="'+name+'"]').first.click()
def catcard(id):return page.locator('[data-catalog-id="'+id+'"]')
def snapshot():return page.evaluate('JSON.parse(localStorage.getItem(LadleStorage.KEY)).state')
def product(id):return next(p for p in snapshot()['catalog'] if p['id']==id)
def nooverflow():
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
def goto_catalog():click('catalog')
def confirm():page.locator('[data-dialog="yes"]').click()
try:
 with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':412,'height':915})
    page.set_default_timeout(5000);page.on('pageerror',lambda ex:errors.append(str(ex)))
    page.evaluate('''()=>{const data={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}})}''')
    page.set_content((R/'preview/Laedle-preview.html').read_text());page.wait_for_function('window.LadleAppReady===true')
    for _ in range(2):page.get_by_test_id('wizard-next').click()
    check('wizard offers translated catalog opt-in, without automatic prices',lambda:expect(page.locator('[name=catalog]')).to_be_checked())
    page.get_by_test_id('wizard-next').click()
    check('setup adds 91 templates and no dates or customer records',lambda:eq((len(snapshot()['catalog']),len(snapshot()['events']),len(snapshot()['orders'])),(91,0,0)))
    goto_catalog()
    check('catalog renders 40 illustrated cards initially',lambda:eq((page.locator('.catalog-card').count(),page.locator('.catalog-card svg[role=img]').count()),(40,40)))
    click('catalog-more')
    check('51 active cards can be displayed',lambda:eq(page.locator('.catalog-card').count(),51))
    page.locator('[name=catalogStatus]').select_option('all')
    click('catalog-more');click('catalog-more')
    check('all 91 templates remain available',lambda:eq(page.locator('.catalog-card').count(),91))
    page.locator('[name=catalogCategory]').select_option('lamb')
    check('category filter returns nine lamb cuts',lambda:eq(page.locator('.catalog-card').count(),9))
    page.locator('[name=catalogSearch]').fill('шея')
    check('Russian product search works in German interface',lambda:eq(page.locator('.catalog-card').count(),1))
    page.locator('[name=catalogSearch]').fill('')
    id='tpl-lamb-5'
    catcard(id).locator('[data-action=catalog-edit]').click()
    page.locator('[name="name-en"]').fill('Farm double chop');page.locator('[name=priceRaw]').fill('45,00')
    page.get_by_test_id('save-catalog').click()
    check('rename and decimal comma template price save',lambda:eq((product(id)['names']['en'],product(id)['defaultPrice']),('Farm double chop',4500)))
    catcard(id).locator('[data-action=catalog-toggle]').click()
    check('deactivate card persists inactive status',lambda:eq(product(id)['active'],False))
    page.locator('[name=catalogStatus]').select_option('inactive')
    check('inactive filter shows deactivated card',lambda:eq(page.locator('.catalog-card').count(),1))
    catcard(id).locator('[data-action=catalog-toggle]').click();page.locator('[name=catalogStatus]').select_option('all')
    check('activate card persists active status',lambda:eq(product(id)['active'],True))
    # Real UI locale and skin controls. Capture source view, do not invent rendered results.
    for language in ['de','en','ru']:
      for skin in ['light','dark','paper','compact']:
        click('settings');click('appearance');page.locator('[name=language]').select_option(language)
        page.locator(f'[name=skin][value={skin}]').check();goto_catalog()
        check(f'catalog readable at 360px: {language}, {skin}',lambda:(page.set_viewport_size({'width':360,'height':900}),nooverflow(),eq(page.locator('.catalog-card').count(),9),eq(page.locator('html').get_attribute('lang'),language)))
        if language=='de':
          expect(page.locator("#toast")).not_to_have_class(re.compile(r".*\bvisible\b.*"))
          page.screenshot(path=str(R/f'reports/catalog-{skin}.png'),full_page=False)
    page.set_viewport_size({'width':320,'height':900});page.evaluate("document.documentElement.style.fontSize='150%'")
    check('catalog 320px with 150% text has no horizontal overflow',nooverflow)
    page.evaluate("document.documentElement.style.fontSize=''");page.set_viewport_size({'width':412,'height':915})
    click('settings');click('appearance');page.locator('[name=language]').select_option('de');page.locator('[name=skin][value=compact]').check()
    # Date -> catalog -> order -> rename master -> archive -> fulfill.
    click('home');click('new-event');page.locator('[name=title]').fill('Lamm 23.10.');page.locator('[name=date]').fill('2026-10-23')
    click('catalog-pick');page.locator('[name=catalogChoice]').select_option(id)
    check('date picker takes the catalog price',lambda:eq(page.locator('[name=catalogEventPrice]').input_value(),'45'))
    page.locator('[data-dialog=add]').click()
    check('date draft includes product illustration',lambda:expect(page.locator('[data-product-index] svg[role=img]')).to_have_count(1))
    page.get_by_test_id('save-event').click();eventid=snapshot()['events'][0]['id']
    check('date stores a frozen catalog snapshot',lambda:eq(snapshot()['events'][0]['items'][0]['names']['en'],'Farm double chop'))
    click('new-order');page.locator('[name=lastName]').fill('Testkunde');page.locator('[name="lineWeight-0"]').fill('1,5');page.get_by_test_id('save-order').click()
    check('order uses exact snapshot price 1.5 kg x 45 euro',lambda:eq(page.evaluate('LadleDomain.summary(JSON.parse(localStorage.getItem(LadleStorage.KEY)).state,'+json.dumps(eventid)+').plannedTotal'),6750))
    goto_catalog();catcard(id).locator('[data-action=catalog-edit]').click();page.locator('[name="name-en"]').fill('New master name');page.locator('[name=priceRaw]').fill('55');page.get_by_test_id('save-catalog').click()
    check('renaming and repricing master preserves old order and date',lambda:eq((snapshot()['orders'][0]['lines'][0]['price'],snapshot()['orders'][0]['lines'][0]['names']['en'],snapshot()['events'][0]['items'][0]['price']),(4500,'Farm double chop',4500)))
    catcard(id).locator('[data-action=catalog-delete]').click();confirm();expect(catcard(id)).to_have_count(0)
    check('deletion of used product archives it and keeps order',lambda:eq((product(id)['archived'],product(id)['active'],len(snapshot()['orders'])),(True,False,1)))
    page.locator('[name=catalogStatus]').select_option('archived')
    check('archived card remains discoverable',lambda:eq(page.locator('.catalog-card').count(),1))
    catcard(id).locator('[data-action=catalog-restore]').click()
    check('restore from archive returns an inactive template',lambda:eq((product(id)['active'],product(id)['archived']),(False,False)))
    click('home');click('event');click('event-menu');page.locator('[data-dialog=edit]').click();page.locator('[name="itemActive-0"]').uncheck();page.get_by_test_id('save-event').click()
    check('inactive dated article cannot start new order',lambda:eq(page.locator('[data-action=new-order]').count(),0))
    page.locator('[data-tab=items]').click()
    check('deactivation retains 1.5kg preparation and visible illustration',lambda:(expect(page.locator('.product-card')).to_contain_text('1,5'),eq(page.locator('.product-card svg[role=img]').count(),1)))
    page.screenshot(path=str(R/'reports/catalog-preparation.png'))
    page.locator('[data-tab=customers]').click();click('order');click('sale-form');page.locator('[name="saleWeight-0"]').fill('1,4');page.get_by_test_id('save-sale').click()
    check('actual sale still works for deactivated product',lambda:eq(snapshot()['orders'][0]['sale']['lines'][0]['grams'],1400))
    # Custom card CRUD and XSS safety.
    goto_catalog();click('catalog-new');page.locator('[name="name-de"]').fill('<img src=x onerror="window.PWNED=true">');page.locator('[name=category]').select_option('other');page.locator('[name=imageKey]').select_option('other');page.get_by_test_id('save-catalog').click()
    custom=snapshot()['catalog'][-1]['id'];page.locator('[name=catalogCategory]').select_option('other');page.locator('[name=catalogStatus]').select_option('all')
    check('custom product names render as literal text, not executable markup',lambda:(expect(catcard(custom)).to_contain_text('<img'),eq(page.evaluate('Boolean(window.PWNED)'),False),eq(catcard(custom).locator('img').count(),0)))
    catcard(custom).locator('[data-action=catalog-delete]').click();confirm();expect(catcard(custom)).to_have_count(0)
    check('unused custom product really deletes',lambda:eq(any(x['id']==custom for x in snapshot()['catalog']),False))
    check('no JavaScript exceptions in catalog scenarios',lambda:eq(errors,[]))
    browser.close()
except Exception as ex:
 fatal_error=str(ex)
 traceback.print_exc()
finally:
 report={'version':'0.3.0','mode':'Desktop Chromium / actual preview hash CSP / memory storage / NOT Android','passed':sum(x['status']=='passed' for x in results),'failed':sum(x['status']=='failed' for x in results),'pageErrors':errors,'fatalError':fatal_error,'tests':results}
 (R/'reports/catalog-ui-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='tests'},indent=2))
 if report['failed'] or errors or fatal_error or report['passed']!=38:raise SystemExit(1)
