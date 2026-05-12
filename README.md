# ICC Lab Gamut Visualizer

A self-contained browser app for visualizing ICC profile gamuts in CIE Lab space.

## Features

- Load RGB or CMYK `.icc` / `.icm` profiles.
- Render gamuts as a rotatable 3D Lab visualization.
- Supports RGB matrix/TRC profiles plus common A2B LUT transforms.
- Supports common CMYK ICC v2 `mft1` / `mft2` and ICC v4 `mAB` profiles.
- Includes built-in sRGB, Display P3, Adobe RGB, and Rec. 2020 presets.

## Run

Serve the folder with any static web server:

```sh
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```
