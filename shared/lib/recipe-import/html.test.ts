import { describe, expect, it } from 'bun:test'
import { decodeHtmlEntities, findJsonLdBlocks, stripHtml } from './html'

describe('findJsonLdBlocks', () => {
  it('reads a block regardless of attribute order or quoting', () => {
    const html = `
      <script data-id="a" type='application/ld+json'>{"a":1}</script>
      <script type=application/ld+json>{"b":2}</script>
      <script type="application/ld+json; charset=utf-8">{"c":3}</script>
    `

    expect(findJsonLdBlocks(html)).toEqual(['{"a":1}', '{"b":2}', '{"c":3}'])
  })

  it('ignores scripts that are not JSON-LD', () => {
    const html = '<script>var a = 1</script><script type="application/json">{"a":1}</script>'

    expect(findJsonLdBlocks(html)).toEqual([])
  })

  it('unwraps the comment and CDATA guards older plugins emit', () => {
    const html = '<script type="application/ld+json">//<![CDATA[\n{"a":1}\n//]]></script>'

    expect(findJsonLdBlocks(html)).toEqual(['{"a":1}'])
  })
})

describe('decodeHtmlEntities', () => {
  it('decodes named, decimal and hex references', () => {
    expect(decodeHtmlEntities('Salt &amp; pepper')).toBe('Salt & pepper')
    expect(decodeHtmlEntities('it&#39;s')).toBe('it\'s')
    expect(decodeHtmlEntities('caf&#xe9;')).toBe('café')
    expect(decodeHtmlEntities('&frac12; cup')).toBe('½ cup')
  })

  it('decodes exactly once, so double-encoded text keeps its escape', () => {
    // Recipe plugins do emit this. Decoding twice would invent an apostrophe
    // the publisher never wrote.
    expect(decodeHtmlEntities('it&amp;#39;s')).toBe('it&#39;s')
  })

  it('leaves unknown and out-of-range references alone', () => {
    expect(decodeHtmlEntities('&notarealentity;')).toBe('&notarealentity;')
    expect(decodeHtmlEntities('&#1114112;')).toBe('&#1114112;')
    expect(decodeHtmlEntities('&#xD800;')).toBe('&#xD800;')
  })
})

describe('stripHtml', () => {
  it('keeps block breaks as newlines and drops the rest of the markup', () => {
    expect(stripHtml('<p>Chop the <b>onion</b>.</p><p>Fry it.</p>')).toBe('Chop the onion.\nFry it.')
    expect(stripHtml('Mix.<br>Rest.')).toBe('Mix.\nRest.')
  })

  it('drops script and style bodies rather than reading them as text', () => {
    expect(stripHtml('a<style>.x{color:red}</style>b')).toBe('a b')
  })

  it('collapses runs of spaces without joining separate lines', () => {
    expect(stripHtml('<p>a   b</p>\n\n<p>c</p>')).toBe('a b\nc')
  })
})
