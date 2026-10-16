"""UI checks against the exact packaged assets in Chromium.

Default mode serves the packaged files over localhost (real CSP + browser storage).
--in-memory loads the same JS/CSS into an offline document, replacing localStorage
with an in-memory adapter. This is needed in managed environments that block ALL
browser navigation. It does NOT test WebView, the native bridge, or native SQLite.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import argparse, json, re, threading, time, traceback
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'app/src/main/assets/www'
REPORTS = ROOT / 'reports'
REPORTS.mkdir(exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--in-memory', action='store_true')
parser.add_argument('--chromium', default='/usr/bin/chromium')
args = parser.parse_args()
results = []
errors = []
server = None
if not args.in_memory:
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ASSETS)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_address[1]}/'


def run(name, action):
    try:
        action()
        results.append({'name': name, 'status': 'passed'})
        print('PASS', name, flush=True)
    except Exception as exc:
        results.append({'name': name, 'status': 'failed', 'error': str(exc)})
        print('FAIL', name, str(exc), flush=True)
        raise


def mount(browser, data=None, width=412, height=915, fatal=False):
    page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
    page.set_default_timeout(6000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    if args.in_memory:
        html = (ASSETS / 'index.html').read_text()
        html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '', html)
        html = re.sub(r'<script[^>]*src=[^>]*></script>', '', html)
        html = re.sub(r'<link[^>]*>', '', html)
        page.set_content(html)
        page.evaluate('''initial => {
          const data = initial || {};
          Object.defineProperty(window, 'localStorage', {value:{
            getItem:key=>data[key] || null,
            setItem:(key,value)=>{data[key]=String(value)},
            removeItem:key=>{delete data[key]},
            clear:()=>Object.keys(data).forEach(key=>delete data[key])
          }});
        }''', data)
        page.add_style_tag(content=(ASSETS / 'styles.css').read_text())
        for name in ['catalog-data.js','core.js', 'storage.js', 'i18n.js', 'ui.js']:
            page.add_script_tag(content=(ASSETS / name).read_text())
    else:
        if data:
            page.add_init_script('Object.entries('+json.dumps(data)+').forEach(([k,v])=>localStorage.setItem(k,v));')
        page.goto(URL)
    if fatal:
        page.wait_for_selector('.error-box')
    else:
        page.wait_for_function('window.LadleAppReady === true')
    return page


def snapshot(page):
    return page.evaluate('JSON.parse(localStorage.getItem(LadleStorage.KEY))')


def snapshot_seed(page):
    return page.evaluate('({[LadleStorage.KEY]:localStorage.getItem(LadleStorage.KEY)})')


def click(page, name):
    page.locator(f'[data-action="{name}"]').first.click()


def eq(a, b):
    assert a == b, f'{a!r} != {b!r}'


def setup(page, demo=False, language='de'):
    page.locator('[name="language"]').select_option(language)
    page.get_by_test_id('wizard-next').click()
    page.get_by_test_id('wizard-next').click()
    if demo:
        page.locator('[name="demo"]').check()
    page.get_by_test_id('wizard-next').click()
    expect(page.locator('[data-action="new-event"]')).to_be_visible()


def no_overflow(page):
    sizes=page.evaluate('({scroll:document.documentElement.scrollWidth,width:window.innerWidth})')
    assert sizes['scroll'] <= sizes['width']+1, sizes


try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox'])
        page=mount(browser)
        page.screenshot(path=str(REPORTS/'setup-1-shop.png'))
        run('wizard initially asks for shop data', lambda: expect(page.locator('h1')).to_have_text('Willkommen im Lädle'))
        def blank_shop():
            page.locator('[name="name"]').fill('')
            page.get_by_test_id('wizard-next').click()
            expect(page.locator('[name="name"]')).to_be_visible()
            assert page.locator('[name="name"]').evaluate('(x)=>!x.checkValidity()')
        run('wizard blocks empty required shop name', blank_shop)
        def full_setup():
            page.locator('[name="name"]').fill('Lädle Testhof')
            page.locator('[name="owner"]').fill('Ansprechperson Test')
            page.get_by_test_id('wizard-next').click()
            for key,value in {'street':'Testweg 7','zip':'12345','city':'Testort','phone':'+49 000','email':'test@example.invalid','hours':'Freitag 17:30–19:00'}.items():
                page.locator(f'[name="{key}"]').fill(value)
            page.get_by_test_id('wizard-next').click()
            page.screenshot(path=str(REPORTS/'setup-3-skins.png'))
            page.get_by_test_id('skin-dark').check()
            expect(page.locator('html')).to_have_attribute('data-skin','dark')
            page.get_by_test_id('wizard-next').click()
            s=snapshot(page)['state']
            eq(s['shop']['street'],'Testweg 7');eq(s['shop']['hours'],'Freitag 17:30–19:00');eq(s['orders'],[])
        run('three-step wizard saves contacts and chosen skin without demo orders', full_setup)
        def create_event():
            click(page,'new-event')
            page.locator('[name="title"]').fill('Frisches Rindfleisch')
            page.locator('[name="date"]').fill('2026-10-23')
            page.locator('[name="time"]').fill('17:30')
            page.locator('[name="itemName-0"]').fill('Beinscheibe')
            page.locator('[name="itemPrice-0"]').fill('15,00')
            click(page,'add-product')
            page.locator('[name="itemName-1"]').fill('Hackfleisch')
            page.locator('[name="itemPrice-1"]').fill('12')
            page.get_by_test_id('save-event').click()
            eq(len(snapshot(page)['state']['events']),1)
            expect(page.locator('[data-testid="planned-total"]')).to_contain_text('0,00')
        run('create a date with two products and German decimal prices', create_event)
        def new_order():
            click(page,'new-order')
            page.locator('[name="firstName"]').fill('Anna')
            page.locator('[name="lastName"]').fill('Muster')
            page.locator('[name="phone"]').fill('+49 000 123')
            page.locator('[name="lineWeight-0"]').fill('2')
            click(page,'add-line')
            page.locator('[name="lineWeight-1"]').fill('1')
            expect(page.locator('#draft-total')).to_contain_text('42,00')
            page.get_by_test_id('save-order').click()
            eq(len(snapshot(page)['state']['orders']),1)
            expect(page.locator('[data-action="sale-form"]')).to_be_visible()
        run('create buyer and multi-item order with live EUR 42 total', new_order)
        def blank_sale():
            click(page,'sale-form')
            eq(page.locator('[name="saleWeight-0"]').input_value(),'')
            eq(page.locator('[name="salePrice-0"]').input_value(),'15')
            page.get_by_test_id('save-sale').click()
            eq(snapshot(page)['state']['orders'][0]['sale'],None)
        run('sale weights start empty and blank fields cannot be recorded', blank_sale)
        def save_sale():
            page.locator('[name="saleWeight-0"]').fill('1,8')
            page.locator('[name="saleWeight-1"]').fill('0')
            expect(page.locator('#draft-total')).to_contain_text('27,00')
            page.screenshot(path=str(REPORTS/'sale-actual-weight.png'))
            page.get_by_test_id('save-sale').click()
            expect(page.locator('[data-testid="order-sold-total"]')).to_contain_text('27,00')
            order=snapshot(page)['state']['orders'][0]
            eq(order['lines'][0]['grams'],2000);eq(order['sale']['lines'][0]['grams'],1800)
        run('actual sale at 1.8 kg records EUR 27 and preserves 2 kg preorder',save_sale)
        def details():
            click(page,'back')
            expect(page.locator('[data-testid="planned-total"]')).to_contain_text('42,00')
            expect(page.locator('[data-testid="sold-total"]')).to_contain_text('27,00')
            page.locator('[data-tab="items"]').click()
            page.locator('[data-action="item"]').filter(has_text='Beinscheibe').click()
            expect(page.locator('h1')).to_have_text('Beinscheibe')
            expect(page.locator('main')).to_contain_text('Muster, Anna')
            expect(page.locator('main')).to_contain_text('1,8 kg')
        run('date totals and per-product allocations show plan and actual separately',details)
        def closed():
            click(page,'back');click(page,'event-menu')
            page.locator('[data-dialog="finish"]').click();page.locator('[data-dialog="yes"]').click()
            page.wait_for_function('JSON.parse(localStorage.getItem(LadleStorage.KEY)).state.events[0].closed === true')
            eq(snapshot(page)['state']['events'][0]['closed'],True)
            expect(page.locator('[data-action="new-order"]')).to_have_count(0)
        run('completed date can be closed and editing controls disappear',closed)
        def reopen():
            click(page,'event-menu');page.locator('[data-dialog="reopen"]').click();page.locator('[data-dialog="yes"]').click()
            page.wait_for_function('JSON.parse(localStorage.getItem(LadleStorage.KEY)).state.events[0].closed === false')
            eq(snapshot(page)['state']['events'][0]['closed'],False)
        run('closed date can be reopened explicitly',reopen)
        def date_copy():
            click(page,'event-menu');page.locator('[data-dialog="copy"]').click()
            page.locator('[name="copyDate"]').fill('2026-11-06')
            page.locator('[data-dialog="save"]').click()
            page.wait_for_function('JSON.parse(localStorage.getItem(LadleStorage.KEY)).state.events.length === 2')
            s=snapshot(page)['state'];eq(len(s['events']),2);eq(len(s['orders']),1)
            expect(page.locator('[data-testid="planned-total"]')).to_contain_text('0,00')
        run('copy assortment creates an empty independent date',date_copy)
        def date_switch():
            click(page,'choose-date')
            page.locator('#modal .menu-grid button').first.click()
            expect(page.locator('[data-testid="planned-total"]')).to_contain_text('42,00')
        run('date dropdown restores only that date’s totals',date_switch)
        run('no horizontal overflow at 412px',lambda:no_overflow(page))
        def persist():
            seed=snapshot_seed(page);second=mount(browser,seed)
            eq(snapshot(second)['state'],snapshot(page)['state'])
            expect(second.locator('[data-action="event"]')).to_have_count(2)
            second.close()
        run('fresh UI instance reloads the exact saved snapshot',persist)
        page.close()

        # Demonstration dataset for sorting, skins and responsive checks.
        page=mount(browser);setup(page,demo=True);seed=snapshot_seed(page)
        click(page,'event')
        run('demo date displays three complete customer cards',lambda:expect(page.locator('.order-card')).to_have_count(3))
        run('demo totals display EUR 139.50',lambda:expect(page.locator('[data-testid="planned-total"]')).to_contain_text('139,50'))
        def search():
            page.locator('[name="search"]').fill('Anna')
            expect(page.locator('.order-card')).to_have_count(1)
            expect(page.locator('.order-card')).to_contain_text('Muster, Anna')
            page.locator('[name="search"]').fill('')
        run('name search filters customer cards without losing input focus',search)
        def filtering():
            product=snapshot(page)['state']['events'][0]['items'][1]['id']
            page.locator('[name="product"]').select_option(product)
            expect(page.locator('.order-card')).to_have_count(2)
            page.locator('[name="product"]').select_option('')
        run('product filter finds only customers ordering that product',filtering)
        def sorting():
            page.locator('[name="sort"]').select_option('total');click(page,'direction')
            expect(page.locator('.order-card').first).to_contain_text('58,50')
        run('descending amount sort puts highest order first',sorting)
        def cancel():
            page.locator('.order-card').filter(has_text='Beispiel, Paul').click()
            click(page,'cancel-order');page.locator('[data-dialog="yes"]').click()
            page.wait_for_function('JSON.parse(localStorage.getItem(LadleStorage.KEY)).state.orders.some(o=>o.cancelled)')
            click(page,'back')
            expect(page.locator('[data-testid="planned-total"]')).to_contain_text('97,50')
            page.locator('[name="status"]').select_option('cancelled');expect(page.locator('.order-card')).to_have_count(1)
        run('cancelled order stays visible but is excluded from totals',cancel)
        def uncancel():
            click(page,'order');click(page,'uncancel-order');click(page,'back')
            page.locator('[name="status"]').select_option('all')
            expect(page.locator('[data-testid="planned-total"]')).to_contain_text('139,50')
        run('restoring a cancelled order restores preparation totals',uncancel)
        def block_close():
            click(page,'event-menu');page.locator('[data-dialog="finish"]').click();page.locator('[data-dialog="yes"]').click()
            expect(page.locator('#modal')).to_contain_text('offene Bestellungen')
            page.locator('[data-dialog="close"]').click()
            eq(snapshot(page)['state']['events'][0]['closed'],False)
        run('closing a date with pending orders shows an explanation',block_close)
        def discard_guard():
            click(page,'new-order');page.locator('[name="lastName"]').fill('Unsaved')
            click(page,'back');expect(page.locator('#modal')).to_contain_text('verwerfen')
            page.locator('[data-dialog="cancel"]').click()
            eq(page.locator('[name="lastName"]').input_value(),'Unsaved')
            click(page,'back');page.locator('[data-dialog="yes"]').click()
            eq(len(snapshot(page)['state']['orders']),3)
        run('unsaved edits require explicit discard and are not silently saved',discard_guard)
        def duplicate_customer():
            click(page,'new-order')
            page.locator('[name="firstName"]').fill('Anna');page.locator('[name="lastName"]').fill('Muster')
            page.locator('[name="lineWeight-0"]').fill('1');page.get_by_test_id('save-order').click()
            expect(page.locator('#form-error')).to_contain_text('bereits vorhanden')
            eq(len(snapshot(page)['state']['orders']),3)
            click(page,'back');page.locator('[data-dialog="yes"]').click()
        run('duplicate customer error preserves all saved orders',duplicate_customer)
        original_orders=snapshot(page)['state']['orders']
        for skin in ['light','dark','paper','compact']:
            def skin_check(skin=skin):
                click(page,'settings');click(page,'appearance');page.get_by_test_id('skin-'+skin).check()
                eq(snapshot(page)['state']['shop']['skin'],skin)
                eq(snapshot(page)['state']['orders'],original_orders)
                click(page,'home');click(page,'event')
                no_overflow(page)
                page.wait_for_timeout(100)
                page.evaluate("document.getElementById('toast').classList.remove('visible')")
                page.locator('#toast').evaluate('(x)=>{x.textContent="";x.hidden=true}');page.screenshot(path=str(REPORTS/f'skin-{skin}-customers.png'))
                page.locator('[data-tab="items"]').click()
                expect(page.locator('.product-card')).to_have_count(3)
                page.locator('#toast').evaluate('(x)=>{x.textContent="";x.hidden=true}');page.screenshot(path=str(REPORTS/f'skin-{skin}-products.png'))
            run(f'{skin} skin persists and renders both views without changing data',skin_check)
        def language_ru():
            click(page,'settings');click(page,'appearance');page.locator('[name="language"]').select_option('ru')
            expect(page.locator('h1')).to_have_text('Оформление')
            click(page,'home');expect(page.locator('h1')).to_have_text('Даты выдачи')
        run('Russian UI can be selected without changing orders',language_ru)
        def language_en():
            click(page,'settings');click(page,'appearance');page.locator('[name="language"]').select_option('en')
            expect(page.locator('h1')).to_have_text('Appearance')
            click(page,'home');expect(page.locator('h1')).to_have_text('Pickup dates')
        run('English UI can be selected without changing orders',language_en)
        for width,height in [(320,740),(360,800),(800,1280)]:
            def responsive(width=width,height=height):
                page.set_viewport_size({'width':width,'height':height});click(page,'event');no_overflow(page)
                page.locator('[data-tab="items"]').click();no_overflow(page)
                click(page,'home')
            run(f'customer and product views fit {width}px viewport',responsive)
        def large_text():
            page.set_viewport_size({'width':412,'height':915});click(page,'event')
            page.add_style_tag(content=':root{font-size:24px!important}')
            no_overflow(page)
        run('150% text scaling does not introduce horizontal scrolling',large_text)
        page.close()
        def xss():
            bad=json.loads(next(iter(seed.values())))
            bad['state']['shop']['name']='<img src=x onerror="window.injected=1">'
            bad['state']['customers'][0]['lastName']='<script>window.injected=2</script>'
            unsafe={next(iter(seed)):json.dumps(bad)}
            x=mount(browser,unsafe);click(x,'event')
            eq(x.evaluate('window.injected || 0'),0)
            eq(x.locator('.shop-title img').count(),0)
            expect(x.locator('.shop-title')).to_contain_text('<img')
            x.close()
        run('HTML-like shop and customer names are displayed as text, not executed',xss)
        def corrupted():
            x=mount(browser, {next(iter(seed)):'{broken'}, fatal=True)
            expect(x.locator('.error-box')).to_contain_text('nichts gelöscht')
            eq(x.evaluate('localStorage.getItem(LadleStorage.KEY)'),'{broken')
            x.close()
        run('corrupted browser snapshot is not deleted or silently reset',corrupted)
        run('no JavaScript errors in all completed UI scenarios',lambda:eq(errors,[]))
        browser.close()
except Exception:
    traceback.print_exc()
finally:
    if server: server.shutdown()
    report={'mode':'offline injected assets + in-memory localStorage' if args.in_memory else 'localhost + real CSP + browser localStorage',
            'tests':results,'passed':sum(r['status']=='passed' for r in results),'failed':sum(r['status']=='failed' for r in results),'pageErrors':errors,
            'notCovered':['Android APK compilation','Android WebView runtime','native SQLite','native Storage Access Framework']}
    (REPORTS/'ui-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!='tests'},ensure_ascii=False,indent=2),flush=True)
    if report['failed']: raise SystemExit(1)
