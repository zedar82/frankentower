"""Render SVG drafts with GIMP's installed Cairo/Rsvg Python environment.

Optional helper; the SVGs and Node generator are the portable source assets.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import cairo
import gi

gi.require_version('Rsvg', '2.0')
from gi.repository import Rsvg

root = Path(__file__).resolve().parent
for source in root.rglob('*.svg'):
    xml = ET.parse(source).getroot()
    width, height = int(xml.attrib['width']), int(xml.attrib['height'])
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    context = cairo.Context(surface)
    handle = Rsvg.Handle.new_from_file(str(source))
    viewport = Rsvg.Rectangle()
    viewport.x, viewport.y = 0, 0
    viewport.width, viewport.height = width, height
    handle.render_document(context, viewport)
    surface.write_to_png(str(source.with_suffix('.png')))
print('Rendered all SVGs to PNG.')
