import os
import re
from colorsys import rgb_to_hls, hls_to_rgb

# Параметры
TARGET_HUE = 0  # Желаемый hue в градусах (0-360)
TARGET_HUE_NORMALIZED = TARGET_HUE / 360.0  # Для библиотеки colorsys

# Регулярки для поиска цветов
HEX_PATTERN = r'#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b'
RGB_PATTERN = r'rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)'
RGBA_PATTERN = r'rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)'


def find_all_colors():
    """Найти все уникальные цвета во всех CSS файлах"""
    css_files = [f for f in os.listdir('.') if f.endswith('.css')]
    colors = {}

    for filename in css_files:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()

        # HEX цвета
        for match in re.finditer(HEX_PATTERN, content):
            color = match.group()
            colors[color] = 'hex'

        # RGB цвета
        for match in re.finditer(RGB_PATTERN, content):
            color = match.group()
            colors[color] = 'rgb'

        # RGBA цвета
        for match in re.finditer(RGBA_PATTERN, content):
            color = match.group()
            colors[color] = 'rgba'

    return colors


def set_color_to_target_hue(color_str, color_type):
    """Установить цвету заданный hue, сохранив saturation и lightness"""
    if color_type == 'hex':
        # HEX -> RGB
        hex_val = color_str.lstrip('#')
        if len(hex_val) == 3:
            hex_val = ''.join(c * 2 for c in hex_val)

        r = int(hex_val[0:2], 16) / 255.0
        g = int(hex_val[2:4], 16) / 255.0
        b = int(hex_val[4:6], 16) / 255.0

        # RGB -> HLS -> меняем hue на TARGET_HUE
        h, l, s = rgb_to_hls(r, g, b)
        # Устанавливаем фиксированный hue
        r, g, b = hls_to_rgb(TARGET_HUE_NORMALIZED, l, s)

        # RGB -> HEX
        new_hex = '#{:02x}{:02x}{:02x}'.format(
            int(r * 255),
            int(g * 255),
            int(b * 255)
        )
        return new_hex

    elif color_type == 'rgb':
        # Парсим rgb(r, g, b)
        match = re.match(RGB_PATTERN, color_str)
        r = int(match.group(1)) / 255.0
        g = int(match.group(2)) / 255.0
        b = int(match.group(3)) / 255.0

        # Устанавливаем фиксированный hue
        h, l, s = rgb_to_hls(r, g, b)
        r, g, b = hls_to_rgb(TARGET_HUE_NORMALIZED, l, s)

        # Собираем обратно
        return f'rgb({int(r * 255)}, {int(g * 255)}, {int(b * 255)})'

    elif color_type == 'rgba':
        # Парсим rgba(r, g, b, a)
        match = re.match(RGBA_PATTERN, color_str)
        r = int(match.group(1)) / 255.0
        g = int(match.group(2)) / 255.0
        b = int(match.group(3)) / 255.0
        a = float(match.group(4))

        # Устанавливаем фиксированный hue
        h, l, s = rgb_to_hls(r, g, b)
        r, g, b = hls_to_rgb(TARGET_HUE_NORMALIZED, l, s)

        # Собираем обратно
        return f'rgba({int(r * 255)}, {int(g * 255)}, {int(b * 255)}, {a})'

    return color_str


def main():
    # 1. Ищем все цвета
    print(f"Ищу все цвета в CSS файлах...")
    colors = find_all_colors()

    if not colors:
        print("Не найдено ни одного цвета!")
        return

    print(f"Найдено {len(colors)} уникальных цветов\n")

    # 2. Создаем CLR с цветами, приведенными к целевому hue
    CLR = {}
    for color, color_type in colors.items():
        new_color = set_color_to_target_hue(color, color_type)
        CLR[color] = new_color

    # 3. Выводим CLR
    print("CLR = {")
    for old, new in sorted(CLR.items()):
        print(f'    "{old}": "{new}",')
    print("}")

    print(f"\nВсе цвета приведены к hue: {TARGET_HUE}°")
    if CLR:
        example_old, example_new = list(CLR.items())[0]
        print(f"Пример: {example_old} → {example_new}")


if __name__ == "__main__":
    # Измени TARGET_HUE на нужное значение (0-360 градусов)
    # Например: 0=красный, 120=зеленый, 240=синий, 60=желтый
    main()