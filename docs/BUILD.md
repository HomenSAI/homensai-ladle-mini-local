# Сборка Android и подпись

## Статус этого архива

APK в этой среде не собран. Проверены доменный JavaScript, браузерный UI и отдельные исходники; Android API, Android Lint и native tests ещё не запускались. Журнал попытки: `reports/android-build-attempt-current.txt`.

## Закреплённая конфигурация

| Компонент | Версия |
|---|---|
| Android Gradle Plugin | 8.13.2 |
| Gradle | 8.13 |
| JDK | 17 или 21 |
| Compile / target SDK | 36 |
| Build Tools | 35.0.0 |
| Min SDK | 26 (Android 8.0) |
| System WebView | 111+ |
| Application ID | com.homensai.laedle.minilocal |
| Debug ID | com.homensai.laedle.minilocal.debug |

Конфигурация использует опубликованную совместимость AGP 8.13, не заявляет новейшие версии инструментов: https://developer.android.com/build/releases/agp-8-13-0-release-notes

Установите SDK через Android Studio/SDK Manager. Нужны `platforms;android-36`, `build-tools;35.0.0`, `platform-tools`. Принимает условия SDK сам владелец компьютера, скрипт не принимает их скрытно. Укажите `ANDROID_HOME` на каталог SDK и `JAVA_HOME` на JDK. На Windows исходный загрузчик также проверяет стандартные пути Android Studio/JBR и `%LOCALAPPDATA%/Android/Sdk`.

## Вариант A: уже установлен Gradle 8.13

Откройте терминал в корне проекта:

```sh
gradle --no-daemon :app:lintDebug :app:assembleDebug
```

Результат при успешной сборке: `app/build/outputs/apk/debug/app-debug.apk`.

## Вариант B: исходный загрузчик из архива

Требует Python 3.10+ в дополнение к JDK и SDK. Windows: `BUILD_APK_WINDOWS.cmd`. Linux/macOS: `./BUILD_APK.sh`.

Файлы `gradlew` / `gradlew.bat` здесь являются небольшими собственными загрузчиками; официальный `gradle-wrapper.jar` в исходный архив не включён. Загрузчик берёт Gradle 8.13 по HTTPS и перед распаковкой проверяет закреплённый SHA-256:

```text
20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78
```

Источник: https://gradle.org/release-checksums/ (8.13, Binary-only ZIP). При ошибке сети или несовпадении контрольной суммы ничего не выполняется. Кэш: `.tools/`. Во время первой сборки интернет также нужен для Android Gradle Plugin и его build-зависимостей. Само установленное приложение сеть не использует.

## Android Studio и стандартный wrapper

Проект можно открыть как Gradle-проект. Поскольку бинарного официального wrapper JAR нет, при необходимости выберите локально установленный Gradle 8.13 в настройках сборки IDE. Другой путь — после установки Gradle сгенерировать официальный wrapper:

```sh
gradle wrapper --gradle-version 8.13 --distribution-type bin --gradle-distribution-sha256-sum 20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78
```

Команда заменит исходные загрузчики официальными скриптами и создаст JAR. Не отключайте проверку сертификатов или checksum ради обхода ошибки загрузки.

## Установка тестового APK

На тестовом телефоне можно открыть APK средствами Android и предоставить выбранному установщику разрешение установки из этого источника. Либо через подключённое устройство с отладкой:

```sh
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Debug-приложение отличается ID и названием `Lädle Mini Local · Test`. Оно не является подписанным рабочим релизом. Для первых испытаний — только вымышленные данные.

## Инструментальные проверки

```sh
gradle :app:assembleDebug :app:assembleDebugAndroidTest
bash tools/run_device_tests.sh
```

Нужен запущенный Android-эмулятор/тестовое устройство с подходящим System WebView. Собственный `DeviceTests` проверяет настоящую SQLite, конфликт ревизий, отказ от испорченной записи, ограничение истории, повторное открытие базы и запуск WebView с bridge. Его служебная база отдельная, рабочая база не очищается. 25 тестов подготовлены, **в данном пакете результатов их запуска нет**.

`.github/workflows/android.yml` содержит сборку и матрицу эмуляторов API 35/36. Исходники и workflow уже опубликованы в GitHub, но подтверждения запуска CI пока нет. Сам файл YAML не доказывает успешную сборку.

### CI and source publication / CI und Veröffentlichung / CI и публикация

**EN:** The source project and Android workflow are published in the public GitHub repository. No successful GitHub Actions run has been verified. A workflow file alone is not evidence of a passing build.

**DE:** Quellprojekt und Android-Workflow sind im öffentlichen GitHub-Repository veröffentlicht. Ein erfolgreicher GitHub-Actions-Lauf wurde nicht bestätigt. Eine Workflow-Datei allein belegt keinen erfolgreichen Build.

**RU:** Исходный проект и Android workflow опубликованы в публичном репозитории GitHub. Успешный запуск GitHub Actions не подтверждён. Наличие workflow-файла само по себе не подтверждает успешную сборку.

## Рабочая release-подпись

Для обновлений необходим постоянный ключ владельца. Не включайте ключи и пароли в Git или архив исходников. Создайте ключ средствами Android Studio либо `keytool` в защищённой папке вне репозитория, сделайте отдельную защищённую резервную копию.

Настройка release использует переменные окружения:

```text
LAEDLE_KEYSTORE=/absolute/path/to/your-key.jks
LAEDLE_STORE_PASSWORD=...
LAEDLE_KEY_ALIAS=...
LAEDLE_KEY_PASSWORD=...
```

Пароли не вставлять в чат/issue/командный файл, попадающий в репозиторий. После настройки:

```sh
gradle --no-daemon :app:lintRelease :app:assembleRelease :app:bundleRelease
```

Без предоставленного ключа подписанный release не должен считаться готовым. Проверка подписи уже собранного APK:

```sh
apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
```

В дальнейшем увеличивать `versionCode` и сохранять тот же applicationId/ключ. APK из разных CI-запусков, подписанные разными debug-ключами, могут не обновляться друг поверх друга. **Не решать это удалением рабочей базы без проверенной резервной копии.** Для production требуется отдельный стабильный ключ и прогон `ACCEPTANCE.md`.
