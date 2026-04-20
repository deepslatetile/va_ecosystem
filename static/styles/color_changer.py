import os

CLR = {
    "#007bff": "#bfd730",
}

css_files = [f for f in os.listdir('.') if f.endswith('.css')]

for filename in css_files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Тупо заменяем
    for old_color, new_color in CLR.items():
        content = content.replace(old_color, new_color)

    # Записываем обратно
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'Обработан: {filename}')

print('Готово!')