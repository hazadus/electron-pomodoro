# Сгенерировать сообщение коммита (см. https://github.com/hazadus/gh-commitmsg)
commitmsg:
    gh commitmsg --language russian --examples

# Посчитать строки кода в проекте и сохранить в файл
cloc:
    cloc --fullpath --exclude-list-file=.clocignore --md . > cloc.md

# Провести все проверки приложения
check:
    npm run lint
    npm run test:unit
    npm run build