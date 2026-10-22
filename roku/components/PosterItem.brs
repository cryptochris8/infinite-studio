sub init()
    m.ring = m.top.findNode("ring")
    m.placeholder = m.top.findNode("placeholder")
    m.fallback = m.top.findNode("fallback")
    m.poster = m.top.findNode("poster")
end sub

sub onContent()
    item = m.top.itemContent
    if item = invalid then return
    m.fallback.text = item.title
    m.poster.uri = item.posterUrl
end sub

sub onLayout()
    w = m.top.width
    h = m.top.height
    t = 5
    setBox(m.top.findNode("ringTop"), 0, 0, w, t)
    setBox(m.top.findNode("ringBottom"), 0, h - t, w, t)
    setBox(m.top.findNode("ringLeft"), 0, 0, t, h)
    setBox(m.top.findNode("ringRight"), w - t, 0, t, h)
    m.placeholder.width = w
    m.placeholder.height = h
    m.fallback.translation = [12, 0]
    m.fallback.width = w - 24
    m.fallback.height = h
    m.poster.width = w
    m.poster.height = h
end sub

sub setBox(node as object, x as float, y as float, w as float, h as float)
    node.translation = [x, y]
    node.width = w
    node.height = h
end sub

' Only the focused poster of the list that has focus gets the red ring.
sub onFocus()
    listHasFocus = m.top.rowListHasFocus or m.top.gridHasFocus
    if listHasFocus
        m.ring.opacity = m.top.focusPercent
    else
        m.ring.opacity = 0
    end if
end sub
