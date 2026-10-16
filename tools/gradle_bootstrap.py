#!/usr/bin/env python3
"""Source-only bootstrap. NOT the official binary Gradle Wrapper.
Downloads a pinned official Gradle distribution over HTTPS and verifies SHA-256.
No SDK licenses are silently accepted. Requires Python 3.10+, JDK 17/21, Android SDK.
Checksum source: https://gradle.org/release-checksums/ (Gradle 8.13 binary distribution).
"""
from pathlib import Path, PurePosixPath
import hashlib, os, shutil, stat, subprocess, sys, tempfile, urllib.request, zipfile

ROOT=Path(__file__).resolve().parents[1]
VERSION='8.13'
SHA256='20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78'
URL=f'https://services.gradle.org/distributions/gradle-{VERSION}-bin.zip'
CACHE=Path(os.environ.get('LAEDLE_TOOL_CACHE', str(ROOT/'.tools'))).resolve()


def configure_environment():
    env=os.environ.copy()
    if not env.get('JAVA_HOME'):
        candidates=[]
        if os.name=='nt':
            candidates += [Path(env.get('ProgramFiles','C:/Program Files'))/'Android/Android Studio/jbr']
        candidates += [Path('/Applications/Android Studio.app/Contents/jbr/Contents/Home')]
        for path in candidates:
            if (path/'bin'/('java.exe' if os.name=='nt' else 'java')).exists():
                env['JAVA_HOME']=str(path);break
    if env.get('JAVA_HOME'):
        env['PATH']=str(Path(env['JAVA_HOME'])/'bin')+os.pathsep+env.get('PATH','')
    if not shutil.which('java',path=env.get('PATH')):
        raise RuntimeError('Java not found. Install Android Studio / JDK 17 or 21 and set JAVA_HOME.')
    if not env.get('ANDROID_HOME') and not env.get('ANDROID_SDK_ROOT'):
        candidates=[Path.home()/'Android/Sdk',Path.home()/'Library/Android/sdk']
        if env.get('LOCALAPPDATA'): candidates.insert(0,Path(env['LOCALAPPDATA'])/'Android/Sdk')
        for path in candidates:
            if path.is_dir(): env['ANDROID_HOME']=str(path);break
    return env


def check_zip_name(name):
    p=PurePosixPath(name)
    if '\\' in name or p.is_absolute() or '..' in p.parts or not p.parts or p.parts[0]!=f'gradle-{VERSION}':
        raise ValueError('Unexpected path in Gradle ZIP: '+name)


def get_gradle():
    folder=CACHE/f'gradle-{VERSION}'
    executable=folder/'bin'/('gradle.bat' if os.name=='nt' else 'gradle')
    if executable.exists() and (folder/'.laedle-verified').exists() and (folder/'.laedle-verified').read_text().strip()==SHA256:
        return executable
    CACHE.mkdir(parents=True,exist_ok=True)
    lock=CACHE/'bootstrap.lock'
    try: fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    except FileExistsError: raise RuntimeError('Another bootstrap is active. Remove .tools/bootstrap.lock only if that process stopped.')
    os.close(fd)
    try:
        with tempfile.TemporaryDirectory(prefix='gradle-',dir=CACHE) as temp:
            temp=Path(temp); archive=temp/'distribution.zip'; digest=hashlib.sha256()
            print(f'Downloading verified Gradle {VERSION} from {URL}',flush=True)
            req=urllib.request.Request(URL,headers={'User-Agent':'Laedle-Mini-Local-build-bootstrap/0.3.0'})
            with urllib.request.urlopen(req,timeout=30) as response, archive.open('wb') as output:
                if not response.geturl().startswith('https://'): raise RuntimeError('Non-HTTPS redirect refused')
                total=0
                while chunk:=response.read(1024*1024):
                    total+=len(chunk)
                    if total>200*1024*1024: raise RuntimeError('Unexpected distribution size')
                    output.write(chunk);digest.update(chunk)
            if digest.hexdigest()!=SHA256: raise RuntimeError('Gradle SHA-256 mismatch. Nothing will be executed.')
            with zipfile.ZipFile(archive) as z:
                if sum(i.file_size for i in z.infolist())>700*1024*1024: raise RuntimeError('Unexpected uncompressed size')
                for info in z.infolist():
                    check_zip_name(info.filename)
                    if stat.S_ISLNK(info.external_attr >> 16): raise RuntimeError('ZIP symlink refused')
                z.extractall(temp)
            extracted=temp/f'gradle-{VERSION}'
            (extracted/'bin/gradle').chmod(0o755)
            (extracted/'.laedle-verified').write_text(SHA256+'\n')
            if folder.exists(): shutil.rmtree(folder)
            shutil.move(str(extracted),folder)
        return executable
    finally: lock.unlink(missing_ok=True)


def main():
    env=configure_environment()
    executable=get_gradle()
    # Arguments come directly from the operator. No application/customer input is executed.
    command=[str(executable),*sys.argv[1:]]
    if os.name=='nt':
        command=[env.get('COMSPEC','cmd.exe'),'/d','/c',*command]
    return subprocess.call(command,cwd=ROOT,env=env)


if __name__=='__main__':
    try: raise SystemExit(main())
    except (OSError,RuntimeError,ValueError,zipfile.BadZipFile) as exc:
        print('BUILD NOT RUN: '+str(exc),file=sys.stderr)
        print('See docs/BUILD.md. Internet is required for the first tool/dependency download.',file=sys.stderr)
        raise SystemExit(2)
