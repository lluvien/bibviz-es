# BibViz en español

Adaptación independiente de https://github.com/bibviz/bibviz (base: `76ad173`).
Conserva el historial y los archivos originales. El generador español es independiente
del antiguo Wintersmith y funciona con Node.js 20 o posterior, sin instalar paquetes.

## Compilar y ver

```sh
node build-es.cjs
node verify-es.cjs
python -m http.server 8088 --bind 127.0.0.1 --directory dist
```

Abrir http://127.0.0.1:8088/. No abrir los HTML con `file://`, porque los gráficos y el
lector cargan JSON mediante HTTP.

Incluye 671 entradas de tres fuentes, los gráficos originales, búsqueda en español,
66 libros de la Reina-Valera 1909. La fuente tiene 31.102 posiciones numeradas,
18 de ellas sin texto por diferencias de numeración; el lector las señala sin
añadir contenido. Los títulos están traducidos;
los enlaces al análisis de las fuentes llevan a sitios externos en inglés.
Las páginas agrupan las citas según el original, pero no traducen las etiquetas
interpretativas de esos grupos. Se muestran como «Grupo 1», «Grupo 2», etc.

El cuerpo de la RV1909 se obtuvo de https://ebible.org/Scriptures/spaRV1909_vpl.zip,
con declaración de dominio público en https://ebible.org/details.php?id=spaRV1909.
El JSON importado se incluye en `web/contents/data/rv1909-full.json`; no hace falta
volver a descargarlo para compilar. `prepare_es.py` documenta la importación inicial.

`dist/build-report.json` registra las erratas normalizadas de las referencias, las
diferencias de numeración y las referencias no disponibles. Los libros de Macabeos
y Baruc no están en la edición RV1909 de 66 libros: se muestra un aviso y se conserva
el enlace a la fuente. Jonás 1:17 se presenta como Jonás 2:1 en esta edición, con aviso.

## Publicación prevista en GitHub Pages

Repositorio propuesto: `lluvien/bibviz-es`. Dirección prevista:
https://lluvien.github.io/bibviz-es/ (no se considera publicada hasta verificarla).

1. Crear el repositorio en la cuenta indicada y subir este proyecto conservando su historial.
2. En Settings → Pages → Build and deployment, seleccionar **GitHub Actions**.
3. El flujo `.github/workflows/pages.yml` compila, verifica y publica al actualizar `main`.

Los enlaces y archivos locales son relativos, por lo que funcionan bajo `/bibviz-es/`
y también en la raíz de un dominio. `dist/` es el sitio estático listo para alojar.

## Créditos

Daniel G. Taylor: proyecto, datos y visualización originales. Se conserva el README
original con sus condiciones: obra creativa CC BY-SA 3.0 y código pertinente con
licencia de tipo MIT. La adaptación mantiene esas condiciones. D3.js incluye su
licencia BSD en `web/contents/scripts/vendor/D3-LICENSE.txt`. Los contenidos de
fuentes externas conservan los derechos de sus respectivos titulares.
