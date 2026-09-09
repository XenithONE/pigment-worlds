"""CPU geometry audit; input paintings and production outline are read-only.

Trace strong color boundaries close to the existing outer silhouette and make
diagnostic plots. The output is numerical skyline geometry, not a repainting.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

project = Path(__file__).resolve().parent.parent
qa = project.parent.parent / '.qa-pigment/canyon-impasto-silhouette'
qa.mkdir(parents=True, exist_ok=True)
source = np.array(Image.open(project / 'design/source-images/canyon-vista-impasto-candidate-source.png').convert('RGB')).astype(float)
height, width = source.shape[:2]
existing = json.loads((project / 'public/art/vistas/canyon-ridgeline.json').read_text())
old = (1 - np.array(existing['outline'])) * (height - 1)
ys = np.arange(280)

# Compare colors across a short vertical baseline so fine bristle highlights
# are weaker than the broad silhouette. Warm sky -> cobalt mountain transitions
# are especially useful; the prior prevents following unrelated cloud ridges.
blur = (np.roll(source, -1, axis=1) + source * 2 + np.roll(source, 1, axis=1)) / 4
above = blur[np.maximum(ys - 3, 0)]
below = blur[ys + 3]
contrast = np.sqrt(np.sum((above - below) ** 2, axis=2))
blue_change = (below[:, :, 2] - below[:, :, 0]) - (above[:, :, 2] - above[:, :, 0])
score = contrast * .012 + np.maximum(blue_change, 0) * .020 - np.abs(ys[:, None] - old[None, :]) * .075
score[np.abs(ys[:, None] - old[None, :]) > 38] = -10000

# A continuous path discourages jumping between isolated impasto highlights.
new = np.zeros(width, dtype=float)
for left, right in [(0, 1509), (1509, 1632), (1632, width)]:
    costs = score[:, left].copy()
    back = np.zeros((right - left, len(ys)), dtype=np.int16)
    for x in range(left + 1, right):
        transitions = costs[:, None] - .24 * np.abs(ys[:, None] - ys[None, :])
        previous = np.argmax(transitions, axis=0)
        back[x - left] = previous
        costs = transitions[previous, ys] + score[:, x]
    y = int(np.argmax(costs))
    for x in range(right - 1, left - 1, -1):
        new[x] = y
        y = int(back[x - left, y])

# White palette-knife strokes share colors with the sky. Constrain ambiguous
# automatic downward jumps, then use visually inspected skyline anchors on
# those bright ridges and thin castle roofs. These are geometry coordinates.
new = np.clip(new, old - 18, old + 6)
anchors = [
    [(73,33),(77,33),(79,38),(83,39),(85,44),(88,43),(92,54),(94,54),(97,58),(100,56),(104,62),(110,70),(116,66),(122,65),(128,69)],
    [(172,29),(176,26),(178,33),(181,36),(184,38),(187,42),(190,44),(193,51),(198,52),(200,60),(206,66),(208,69),(216,64),(222,65),(226,60),(231,64),(237,68),(244,66)],
    [(430,80),(434,86),(439,88),(442,94),(445,91),(449,94),(452,97),(456,95),(460,99),(465,101),(468,100),(472,101),(477,105),(484,103),(488,98),(496,90),(500,84),(504,84),(507,87),(512,94),(515,94),(518,100),(522,105),(524,108),(528,108),(530,115),(534,118),(538,121),(542,123),(544,124),(548,133),(550,138)],
    [(1490,165),(1496,162),(1499,143),(1501,143),(1503,160),(1507,173),(1510,173),(1515,159),(1518,154),(1522,164),(1524,174),(1526,126),(1528,126),(1531,108),(1534,86),(1536,89),(1538,124),(1540,128),(1541,126),(1543,128),(1544,145),(1547,145),(1550,140),(1552,138),(1555,144),(1558,141),(1559,89),(1560,69),(1562,74),(1564,73),(1566,62),(1568,45),(1570,19),(1572,18),(1573,20),(1574,47),(1576,72),(1578,52),(1580,70),(1582,73),(1584,67),(1585,67),(1588,93),(1590,106),(1592,87),(1594,75),(1596,48),(1597,50),(1599,85),(1601,88),(1602,86),(1604,99),(1606,110),(1608,110),(1610,112),(1612,121),(1614,119),(1617,102),(1620,90),(1621,88),(1623,106),(1626,129),(1630,124),(1633,120),(1640,123),(1644,127),(1648,125),(1650,118),(1653,110),(1655,101),(1657,112),(1660,116)],
    [(1612,122),(1614,113),(1616,101),(1617,91),(1618,91),(1620,104),(1623,119),(1626,131),(1630,126),(1633,123),(1640,126),(1644,128),(1648,126),(1650,119),(1653,112),(1655,108),(1656,113),(1660,116)],
    [(1534,86),(1535,105),(1536,108),(1537,121),(1538,124)],
]
for points in anchors:
    coordinates = np.array(points)
    columns = np.arange(points[0][0], points[-1][0] + 1)
    new[columns] = np.interp(columns, coordinates[:, 0], coordinates[:, 1])
# Clipped image-top mountains have no external sky; preserve the full image.
new[old < 1] = 0
candidate = {'width': width, 'height': height, 'outline': np.round(1 - new / (height - 1), 6).tolist()}
(qa / 'candidate-automatic.json').write_text(json.dumps(candidate, separators=(',', ':')))
(project / 'public/art/vistas/canyon-ridgeline-impasto-candidate.json').write_text(json.dumps(candidate, separators=(',', ':')))

fig, axes = plt.subplots(4, 1, figsize=(17, 11), constrained_layout=True)
for ax, (left, right) in zip(axes, [(0, 550), (550, 1100), (1100, 1650), (1650, width)]):
    ax.imshow(source.astype(np.uint8))
    ax.plot(np.arange(width), old, color='#ff354f', lw=1.2, label='Current geometry')
    ax.plot(np.arange(width), new, color='#00f5cc', lw=1, label='Candidate edge trace')
    ax.set_xlim(left, right)
    ax.set_ylim(255, 0)
    ax.grid(alpha=.12)
    ax.legend(loc='lower left', fontsize=8)
    ax.set_title(f'Source columns {left}–{right}')
fig.savefig(qa / 'skyline-boundary-comparison.png', dpi=140)
plt.close(fig)
for name, (left, right, top, bottom) in {'left': (0,550,0,170), 'castle': (1480,1660,0,220)}.items():
    fig, ax = plt.subplots(figsize=((right-left)/40,(bottom-top)/40), constrained_layout=True)
    ax.imshow(source.astype(np.uint8))
    ax.plot(np.arange(width), old, color='#ff354f', lw=.8, label='Current geometry')
    ax.plot(np.arange(width), new, color='#00f5cc', lw=.8, label='Candidate geometry')
    ax.set_xlim(left,right); ax.set_ylim(bottom,top)
    ax.set_xticks(np.arange(left,right,20)); ax.set_yticks(np.arange(top,bottom,20)); ax.grid(alpha=.25)
    ax.legend(loc='lower left', fontsize=8)
    fig.savefig(qa / f'{name}-corrected-detail.png', dpi=160); plt.close(fig)

delta = old - new
report = {'pixels':width, 'median_absolute_delta_px':float(np.median(abs(delta))),
    'p95_absolute_delta_px':float(np.percentile(abs(delta),95)),
    'max_land_recovered_px':float(delta.max()), 'max_sky_trimmed_px':float(-delta.min()),
    'columns_recovering_over_3px':int((delta>3).sum()), 'columns_trimming_over_3px':int((delta < -3).sum()),
    'method':'Constrained color-edge trace with visually inspected geometric anchors; no painting edits.',
    'runtime_validation':'Not GPU rendered; inspect silhouette after root integration.'}
(qa / 'audit-evidence.json').write_text(json.dumps(report, indent=2))
print(qa)
print('edge delta px:', np.percentile(np.abs(old-new), [50, 90, 95, 99]), 'max', np.max(np.abs(old-new)))

