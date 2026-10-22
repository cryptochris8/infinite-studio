sub init()
    m.heading = m.top.findNode("heading")
    m.grid = m.top.findNode("grid")
    m.status = m.top.findNode("status")
    m.grid.observeField("itemSelected", "onItemSelected")
    m.top.observeField("focusedChild", "onFocusChanged")
    m.failed = false
    m.seenListVersion = 0
end sub

sub onLoad()
    m.heading.text = m.top.profileName + "'s List"
    m.failed = false
    m.seenListVersion = m.top.listVersion
    m.status.text = "Loading..."
    m.status.visible = true
    m.task = StartRequest({ path: "/api/roku/list/" + m.top.profileId.toStr() }, "onListLoaded")
end sub

sub onListLoaded(event as object)
    response = event.getData()
    if not response.ok
        m.failed = true
        m.status.text = response.error + Chr(10) + "Press OK to try again."
        return
    end if
    m.grid.content = ItemsToContent(response.data.items)
    if response.data.items.count() = 0
        m.status.text = "Nothing saved yet." + Chr(10) + "Choose " + Chr(34) + "Add to My List" + Chr(34) + " on any movie or show."
    else
        m.status.visible = false
    end if
    if m.top.isInFocusChain() then m.grid.setFocus(true)
end sub

sub onListVersion()
    if m.top.listVersion <> m.seenListVersion then onLoad()
end sub

sub onItemSelected()
    item = m.grid.content.getChild(m.grid.itemSelected)
    if item = invalid then return
    m.top.itemSelected = { mediaType: item.mediaType, tmdbId: item.tmdbId }
end sub

sub onFocusChanged()
    if m.top.hasFocus() then m.grid.setFocus(true)
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if press and key = "OK" and m.failed
        onLoad()
        return true
    end if
    return false
end function
