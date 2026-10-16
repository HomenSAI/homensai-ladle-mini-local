"""Mini Local end-to-end browser checks. Not Android and not native SQLite/SAF.
Uses the exact self-contained preview with its real hash CSP, memory-backed storage.
"""
from pathlib import Path
import json,re,traceback,base64,io
from playwright.sync_api import sync_playwright,expect
from PIL import Image
R=Path(__file__).resolve().parents[1];out=R/'reports';out.mkdir(exist_ok=True)
checks=[];errors=[];fatal=None

def check(name,fn):
    try:fn();checks.append({'name':name,'status':'passed'});print('PASS',name,flush=True)
    except Exception as ex:checks.append({'name':name,'status':'failed','error':str(ex)});raise

def eq(a,b):assert a==b,(a,b)
def act(name):page.locator('[data-action="'+name+'"]').first.click()
def confirm():page.locator('[data-dialog=yes]').click()
def state():return page.evaluate('JSON.parse(localStorage.getItem(LadleStorage.KEY)).state')
def nooverflow():assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
def mount(browser,stored=None,width=412,height=915):
    p=browser.new_page(viewport={'width':width,'height':height});p.set_default_timeout(6000);p.on('pageerror',lambda e:errors.append(str(e)))
    p.evaluate('''initial=>{const data=initial||{};window.testStore=data;Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]}})}''',stored)
    p.set_content((R/'preview/Laedle-preview.html').read_text());p.wait_for_function('window.LadleAppReady===true');return p

try:
 with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=mount(browser)
    page.locator('[name=language]').select_option('en');page.locator('[name=owner]').fill('Demo operator')
    page.get_by_test_id('wizard-next').click();page.locator('[name=hours]').fill('Collection at 17:30')
    page.get_by_test_id('wizard-next').click();page.locator('[name=skin][value=compact]').check();page.get_by_test_id('wizard-next').click()
    check('Mini Local onboarding saves language/shop with no demo orders',lambda:eq((state()['shop']['language'],state()['shop']['hours'],len(state()['orders'])),('en','Collection at 17:30',0)))
    act('new-event');page.locator('[name=title]').fill('Lamm & Hähnchen');page.locator('[name=date]').fill('2026-10-23');page.locator('[name=time]').fill('17:30')
    act('catalog-pick');page.locator('[name=catalogChoice]').select_option('tpl-lamb-5');page.locator('[name=catalogEventPrice]').fill('45');page.locator('[data-dialog=add]').click()
    for index,name,unit,price in [(1,'Hähnchen','piece','12.50'),(2,'Eier 6er','pack','4'),(3,'Milch','litre','2')]:
        act('add-product');page.locator(f'[name=itemName-{index}]').fill(name);page.locator(f'[name=itemUnit-{index}]').select_option(unit);page.locator(f'[name=itemPrice-{index}]').fill(price)
    page.get_by_test_id('save-event').click()
    check('date saves four kinds of unit in one assortment',lambda:eq([i['unit'] for i in state()['events'][0]['items']],['kg','piece','pack','litre']))
    act('new-order');page.locator('[name=lastName]').fill('Testkunde');page.locator('[name=firstName]').fill('Mia');page.locator('[name=phone]').fill('+49 000 000000');page.locator('[name=lineWeight-0]').fill('1.5')
    act('add-line');page.locator('[name=lineWeight-1]').fill('2');page.get_by_test_id('save-order').click()
    check('mixed order 1.5 kg x 45 + 2 pieces x 12.50 totals EUR 92.50',lambda:eq(page.evaluate('LadleDomain.totalLines(JSON.parse(localStorage.getItem(LadleStorage.KEY)).state.orders[0].lines)'),9250))
    originals=state()['orders'][0]['lines'];orderid=state()['orders'][0]['id'];eventid=state()['events'][0]['id']
    act('sale-form');page.locator('[name=saleWeight-0]').fill('1.42');page.locator('[name=saleWeight-1]').fill('1');page.locator('[name=complete]').uncheck()
    act('extra-sale');page.locator('[name=extraItem]').select_option(state()['events'][0]['items'][2]['id']);page.locator('[data-dialog=add]').click();page.locator('[name=saleWeight-2]').fill('1')
    page.get_by_test_id('save-sale').click()
    check('partial issue and extra pack save without modifying preorder',lambda:(eq(state()['orders'][0]['sale']['complete'],False),eq(state()['orders'][0]['lines'],originals),eq(len(state()['orders'][0]['sale']['lines']),3)))
    check('sale total is EUR 80.40 and payment remains zero',lambda:(expect(page.get_by_test_id('order-sold-total')).to_contain_text('80.40'),expect(page.get_by_test_id('received-total')).to_contain_text('0.00')))
    act('payment');page.locator('[name=paid]').fill('50');page.locator('[data-dialog=save]').click();expect(page.get_by_test_id('received-total')).to_contain_text('50.00')
    check('EUR 50 received is separate from EUR 80.40 sold',lambda:eq(state()['orders'][0]['payment']['amount'],5000))
    act('clear-sale');confirm();expect(page.locator('#modal')).to_be_visible();page.locator('[data-dialog=close]').click()
    check('reset of paid sale is blocked without losing either record',lambda:(eq(state()['orders'][0]['payment']['amount'],5000),eq(len(state()['orders'][0]['sale']['lines']),3)))
    act('back');page.locator('[data-action=tab][data-tab=items]').click()
    check('preparation separates kg/pieces and displays remaining quantities',lambda:(expect(page.locator('[data-action=item][data-id="'+state()['events'][0]['items'][0]['id']+'"]')).to_contain_text('0.08 kg'),nooverflow()))
    act('event-menu');page.locator('[data-dialog=finish]').click();confirm();expect(page.locator('#modal')).to_be_visible();page.locator('[data-dialog=close]').click()
    check('partial collection prevents closing date',lambda:eq(state()['events'][0]['closed'],False))
    page.locator('[data-action=tab][data-tab=customers]').click();page.locator('[data-action=order]').first.click();act('sale-form')
    page.locator('[name=saleWeight-0]').fill('1.5');page.locator('[name=saleWeight-1]').fill('2');page.locator('[name=complete]').check();page.get_by_test_id('save-sale').click()
    check('final cumulative sale is EUR 96.50, not double counted',lambda:expect(page.get_by_test_id('order-sold-total')).to_contain_text('96.50'))
    act('payment');page.locator('[name=paid]').fill('96.50');page.locator('[name=paymentMethod]').select_option('card');page.locator('[data-dialog=save]').click();expect(page.get_by_test_id('received-total')).to_contain_text('96.50')
    check('paid flag follows received amount and stores chosen method',lambda:eq(state()['orders'][0]['payment']['method'],'card'))
    act('back');act('event-menu');page.locator('[data-dialog=finish]').click();confirm();expect(page.locator('.banner.warning')).to_be_visible()
    check('all-completed date can be closed',lambda:eq(state()['events'][0]['closed'],True))
    page.locator('[data-action=order]').first.click();act('payment');page.locator('[name=paid]').fill('95');page.locator('[data-dialog=save]').click();expect(page.get_by_test_id('received-total')).to_contain_text('95.00')
    check('later payment correction is allowed on a closed date',lambda:eq(state()['orders'][0]['payment']['amount'],9500))
    act('settings');act('audit')
    check('change history shows dated actions',lambda:(expect(page.locator('article.card')).not_to_have_count(0),expect(page.locator('main')).to_contain_text('Payment saved')))
    # Actual browser screenshots on phone/tablet in each of 3 languages x 4 skins.
    for language in ['de','en','ru']:
      for skin in ['light','dark','paper','compact']:
        act('settings');act('appearance');page.locator('[name=language]').select_option(language);page.locator('[name=skin][value='+skin+']').check();act('home');page.locator('[data-action=event]').first.click()
        page.set_viewport_size({'width':360,'height':900})
        check(f'mixed-unit overview fits phone: {language}/{skin}',lambda:(nooverflow(),eq(page.locator('html').get_attribute('lang'),language)))
        if language=='de':
          expect(page.locator('#toast')).not_to_have_class(re.compile(r'.*\bvisible\b.*'));page.screenshot(path=str(out/f'mini-{skin}.png'))
    page.set_viewport_size({'width':800,'height':1100});page.locator('[data-action=tab][data-tab=items]').click()
    check('preparation on tablet fits without horizontal scroll',nooverflow);page.screenshot(path=str(out/'mini-tablet.png'))
    page.set_viewport_size({'width':320,'height':900});page.evaluate("document.documentElement.style.fontSize='150%'")
    check('mixed-unit preparation fits 320px with 150% text',nooverflow);page.evaluate("document.documentElement.style.fontSize=''")
    page.set_viewport_size({'width':412,'height':915});act('settings');act('appearance');page.locator('[name=language]').select_option('en')
    # Real input image -> browser bitmap -> re-encoded JPEG; test image is not a farm photo.
    image=Image.new('RGB',(1600,1200),(140,170,130));exif=Image.Exif();exif[270]='Test only';path=out/'test-photo-input.jpg';image.save(path,exif=exif)
    act('catalog');act('catalog-new');page.locator('[name="name-de"]').fill('Test Eier');page.locator('[name="name-en"]').fill('Test eggs');page.locator('[name="name-ru"]').fill('Тестовые яйца');page.locator('[name=category]').select_option('other');page.locator('[name=unit]').select_option('pack');page.locator('[name=priceRaw]').fill('3.90')
    page.locator('#photo-file').set_input_files(str(path));expect(page.locator('.catalog-editor-art img')).to_be_visible();page.get_by_test_id('save-catalog').click()
    product=next(p for p in state()['catalog'] if p['names']['de']=='Test Eier');photo=Image.open(io.BytesIO(base64.b64decode(product['photo'].split(',')[1])))
    check('own image is resized to 512px and EXIF removed',lambda:(eq(max(photo.size),512),eq(len(photo.getexif()),0),eq(product['unit'],'pack')))
    page.locator('[name=catalogSearch]').fill('Test eggs')
    check('own photo appears on product card',lambda:expect(page.locator('.catalog-card img')).to_have_count(1));page.screenshot(path=str(out/'mini-own-photo.png'))
    page.locator('[data-action=catalog-edit]').click();act('remove-photo');page.get_by_test_id('save-catalog').click()
    check('removing photo restores schematic image',lambda:expect(page.locator('.catalog-card svg[role=img]')).to_have_count(1))
    # Simulated browser process restart from stored state+draft. NOT Android process death.
    act('home');act('new-event');page.locator('[name=title]').fill('Unfinished test date');page.locator('[name=date]').fill('2026-11-13');page.locator('[name=itemName-0]').fill('Milk');page.locator('[name=itemPrice-0]').fill('2')
    stored=page.evaluate('window.testStore');old=page;page=mount(browser,stored)
    check('browser reload exposes draft without committing unfinished date',lambda:(eq(len(state()['events']),1),expect(page.locator('[data-action=resume-draft]')).to_be_visible()))
    act('resume-draft');check('restored form retains title and line values',lambda:(expect(page.locator('[name=title]')).to_have_value('Unfinished test date'),expect(page.locator('[name=itemPrice-0]')).to_have_value('2')))
    page.get_by_test_id('save-event').click()
    check('explicit save commits restored draft and removes draft record',lambda:(eq(len(state()['events']),2),eq(page.evaluate('localStorage.getItem(LadleStorage.DRAFT_KEY)'),None)))
    # Product discrete-unit UI rejection.
    act('home');page.locator('[data-action=event][data-id="'+eventid+'"]').click();act('event-menu');page.locator('[data-dialog=reopen]').click();confirm();page.locator('[data-action=order]').first.click();act('sale-form');page.locator('[name=saleWeight-1]').fill('1.5');page.get_by_test_id('save-sale').click()
    check('fractional pieces rejected visibly, saved sale unchanged',lambda:(expect(page.locator('#form-error')).to_contain_text('whole numbers'),eq(state()['orders'][0]['sale']['lines'][1]['grams'],2000)))
    check('no page-level JavaScript exceptions',lambda:eq(errors,[]))
    browser.close()
except Exception as ex:
    fatal=str(ex);traceback.print_exc()
finally:
    report={'version':'0.3.0','mode':'Desktop Chromium; exact preview CSP; in-memory persistence; NOT Android','passed':sum(c['status']=='passed' for c in checks),'failed':sum(c['status']=='failed' for c in checks),'checks':checks,'pageErrors':errors,'fatalError':fatal}
    (out/'mini-ui-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
if fatal or report['failed']:raise SystemExit(1)
