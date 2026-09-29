"""Import the public-domain RV1909 source and extend BibViz's Spanish catalogue."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent
data = root / 'web/contents/data'
source = root.parent / 'fuentes/RV1909/spaRV1909_vpl.txt'
english = json.loads(re.search(r'exports.bookNames = (\[.*?\])', (root/'scripts/common.coffee').read_text()).group(1))
spanish = 'Génesis|Éxodo|Levítico|Números|Deuteronomio|Josué|Jueces|Rut|1 Samuel|2 Samuel|1 Reyes|2 Reyes|1 Crónicas|2 Crónicas|Esdras|Nehemías|Ester|Job|Salmos|Proverbios|Eclesiastés|Cantares|Isaías|Jeremías|Lamentaciones|Ezequiel|Daniel|Oseas|Joel|Amós|Abdías|Jonás|Miqueas|Nahúm|Habacuc|Sofonías|Hageo|Zacarías|Malaquías|Mateo|Marcos|Lucas|Juan|Hechos|Romanos|1 Corintios|2 Corintios|Gálatas|Efesios|Filipenses|Colosenses|1 Tesalonicenses|2 Tesalonicenses|1 Timoteo|2 Timoteo|Tito|Filemón|Hebreos|Santiago|1 Pedro|2 Pedro|1 Juan|2 Juan|3 Juan|Judas|Apocalipsis'.split('|')
bible = {}
for line in source.read_text(encoding='utf-8-sig').splitlines():
    code, chapter, verse, text = re.match(r'^(\w+) (\d+):(\d+) (.*)$', line).groups()
    chapters = bible.setdefault(code, {})
    verses = chapters.setdefault(chapter, {})
    assert verse not in verses
    verses[verse] = text
assert len(bible) == len(english) == len(spanish) == 66
books = [dict(code=code, name=en, label=es, chapters=chapters) for (code, chapters), en, es in zip(bible.items(), english, spanish)]
(data/'rv1909-full.json').write_text(json.dumps(books, ensure_ascii=False), encoding='utf-8')
catalogue_path = root/'web/locales/es.json'
catalogue = json.loads(catalogue_path.read_text(encoding='utf-8'))
catalogue.update(dict(zip(english, spanish)))
catalogue.update({'Psalm': 'Salmos', 'Old Testament': 'Antiguo Testamento', 'New Testament': 'Nuevo Testamento', 'Count': 'Cantidad', 'People': 'Personas', 'Time': 'Tiempo', 'Location': 'Lugar', 'Death': 'Muerte', 'Love': 'Amor', 'God': 'Dios', 'Jesus': 'Jesús', 'Other': 'Otros'})
extra = {
    "Abiathar's Father": 'El padre de Abiatar',
    'Centurion spoke to Jesus or his servant?': '¿Habló el centurión con Jesús o lo hizo su siervo?',
    'Does God want everyone to go to heaven?': '¿Quiere Dios que todos vayan al cielo?',
    'How many generations where there from Abraham to Jesus?': '¿Cuántas generaciones hubo desde Abraham hasta Jesús?',
    'How many generations where there from David to the Babylonian Captivity?': '¿Cuántas generaciones hubo desde David hasta el cautiverio en Babilonia?',
    'Is incestuous marriage forbidden?': '¿Está prohibido el matrimonio incestuoso?',
    'Is is ok to call your father, or anyone else, father?': '¿Está bien llamar «padre» a tu padre o a cualquier otra persona?',
    'Should we follow our own hearts and eyes?': '¿Debemos seguir nuestro propio corazón y nuestros ojos?',
    'Was Mary the mother of Jesus blessed?': '¿Fue bendita María, la madre de Jesús?',
    'Was city of Ai rebuilt?': '¿Fue reconstruida la ciudad de Hai?',
    'What is the recipe for the new moon sacrifice?': '¿Cuál es la fórmula para el sacrificio de la luna nueva?',
    'Who was at the Empty Tomb?': '¿Quién estaba en el sepulcro vacío?',
    'Who were the cities of Aijalon and Gathrimmon given to?': '¿A quién se entregaron las ciudades de Ajalón y Gat-rimón?',
    "Who where David's sons?": '¿Quiénes fueron los hijos de David?',
    'Will everyone die?': '¿Morirán todos?',
}
names = dict(zip('Adin Adonikam Arah Asaph Azgad Bani Bebai Bethlehem Bezai Bigvai Delaiah Lod Pahathmoab Senaah Zattu'.split(), 'Adín Adonicam Ara Asaf Azgad Bani Bebai Belén Besai Bigvai Delaía Lod Pahat-moab Senaa Zatu'.split()))
names['the porters'] = 'los porteros'
for en, es in names.items():
    extra[f'How many children did {en} have?'] = f'¿Cuántos hijos tuvo {es}?' if en != 'the porters' else '¿Cuántos hijos tuvieron los porteros?'
catalogue.update(extra)
normalize = lambda s: re.sub(r'[^\w]+', '', s).lower()
normalized = {normalize(k): v for k, v in catalogue.items()}
contra = json.loads((data/'contra.json').read_text())
for category in contra.values():
    for c in category['contradictions']:
        key = c['desc'].strip()
        if key not in catalogue:
            assert normalize(key) in normalized, key
            catalogue[key] = normalized[normalize(key)]
catalogue_path.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Imported', len(books), 'books and', sum(len(v) for b in bible.values() for v in b.values()), 'verses.')
