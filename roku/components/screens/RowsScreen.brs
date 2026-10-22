sub init()
    m.backdrop = m.top.findNode("backdrop")
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroMeta = m.top.findNode("heroMeta")
    m.heroDescription = m.top.findNode("heroDescription")
    m.rows = m.top.findNode("rows")
    m.status = m.top.findNode("status")

    m.rows.observeField("rowItemFocused", "onItemFocused")
    m.rows.observeField("rowItemSelected", "onItemSelected")
    m.top.observeField("focusedChild", "onFocusChanged")

    m.failed = false
    m.seenListVersion = 0
    m.restoreFocus = invalid
end sub

sub onLoad()
    m.failed = false
    m.seenListVersion = m.top.listVersion
    m.status.text = "Loading..."
    m.status.visible = true
    if m.top.mode = "home"
        m.task = StartRequest({ path: "/api/roku/home", query: { profile: m.top.profileId } }, "onRowsLoaded")
    else
        m.task = StartRequest({ path: "/api/roku/browse/" + m.top.mode }, "onRowsLoaded")
    end if
end sub

sub onRowsLoaded(event as object)
    response = event.getData()
    if not response.ok
        m.failed = true
        m.status.text = response.error + Chr(10) + "Press OK to try again."
        m.status.visible = true
        return
    end if

    m.status.visible = false
    m.rows.content = RowsToContent(response.data.rows)
    ' After a reload, go back to the poster that was highlighted, if it still exists.
    position = RestorableRowItem(m.restoreFocus, m.rows.content)
    if position <> invalid then m.rows.jumpToRowItem = position
    m.restoreFocus = invalid
    showHero(focusedItem())
    if m.top.isInFocusChain() then m.rows.setFocus(true)
end sub

' Home shows My List as its first row, so reload when the list changed while we were away.
sub onListVersion()
    if m.top.mode <> "home" or m.top.listVersion = m.seenListVersion then return
    m.restoreFocus = m.rows.rowItemFocused
    onLoad()
end sub

function focusedItem() as object
    content = m.rows.content
    if content = invalid or content.getChildCount() = 0 then return invalid
    position = m.rows.rowItemFocused
    row = 0
    col = 0
    if position <> invalid and position.count() = 2
        row = position[0]
        col = position[1]
    end if
    if row < 0 or row >= content.getChildCount() then row = 0
    rowNode = content.getChild(row)
    if col < 0 or col >= rowNode.getChildCount() then col = 0
    return rowNode.getChild(col)
end function

sub onItemFocused()
    showHero(focusedItem())
end sub

sub showHero(item as object)
    if item = invalid then return
    m.heroTitle.text = item.title
    m.heroMeta.text = item.meta
    m.heroDescription.text = item.description
    StackLabels([m.heroTitle, m.heroMeta, m.heroDescription], 470, 18, "bottom")
    m.backdrop.uri = item.backdropUrl
end sub

sub onItemSelected()
    item = focusedItem()
    if item = invalid then return
    m.top.itemSelected = { mediaType: item.mediaType, tmdbId: item.tmdbId }
end sub

sub onFocusChanged()
    if m.top.hasFocus() then m.rows.setFocus(true)
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if press and key = "OK" and m.failed
        onLoad()
        return true
    end if
    return false
end function
