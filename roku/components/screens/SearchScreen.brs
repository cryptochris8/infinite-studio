sub init()
    m.keyboard = m.top.findNode("keyboard")
    m.results = m.top.findNode("results")
    m.status = m.top.findNode("status")
    m.debounce = m.top.findNode("debounce")

    m.keyboard.observeField("text", "onTextChanged")
    m.debounce.observeField("fire", "runSearch")
    m.results.observeField("itemSelected", "onItemSelected")
    m.top.observeField("focusedChild", "onFocusChanged")

    m.requestId = 0
end sub

sub onLoad()
    m.status.text = "Type a movie or show name."
end sub

sub onTextChanged()
    m.debounce.control = "stop"
    m.debounce.control = "start"
end sub

sub runSearch()
    query = m.keyboard.text.trim()
    m.requestId = m.requestId + 1
    if Len(query) < 2
        m.results.content = invalid
        m.status.text = "Type a movie or show name."
        m.status.visible = true
        return
    end if
    m.status.text = "Searching..."
    m.status.visible = true
    m.task = StartRequest({ path: "/api/roku/search", query: { q: query }, id: m.requestId }, "onResults")
end sub

sub onResults(event as object)
    response = event.getData()
    ' Ignore answers to searches the viewer has already typed past.
    if response.id <> m.requestId then return
    if not response.ok
        m.status.text = response.error
        return
    end if
    items = response.data.items
    m.results.content = ItemsToContent(items)
    if items.count() = 0
        m.status.text = "Nothing found for " + Chr(34) + m.keyboard.text.trim() + Chr(34) + "."
    else
        m.status.visible = false
    end if
end sub

sub onItemSelected()
    item = m.results.content.getChild(m.results.itemSelected)
    if item = invalid then return
    m.top.itemSelected = { mediaType: item.mediaType, tmdbId: item.tmdbId }
end sub

sub onFocusChanged()
    if m.top.hasFocus() then m.keyboard.setFocus(true)
end sub

' Right from the keyboard's edge goes to the results; left from the results' first column comes back.
function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false
    hasResults = m.results.content <> invalid and m.results.content.getChildCount() > 0
    if key = "right" and m.keyboard.isInFocusChain() and hasResults
        m.results.setFocus(true)
        return true
    end if
    if key = "left" and m.results.isInFocusChain()
        m.keyboard.setFocus(true)
        return true
    end if
    return false
end function
