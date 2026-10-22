sub init()
    m.backdrop = m.top.findNode("backdrop")
    m.body = m.top.findNode("body")
    m.titleLabel = m.top.findNode("title")
    m.meta = m.top.findNode("meta")
    m.genres = m.top.findNode("genres")
    m.description = m.top.findNode("description")
    m.credits = m.top.findNode("credits")
    m.cast = m.top.findNode("cast")
    m.watchNote = m.top.findNode("watchNote")
    m.actionList = m.top.findNode("actions")
    m.similarHeading = m.top.findNode("similarHeading")
    m.similar = m.top.findNode("similar")
    m.status = m.top.findNode("status")

    m.actionList.observeField("itemSelected", "onActionSelected")
    m.similar.observeField("rowItemSelected", "onSimilarSelected")
    m.top.observeField("focusedChild", "onFocusChanged")

    m.details = invalid
    m.actions = []
    m.saved = false
    m.busy = false
    m.failed = false
end sub

sub onLoad()
    m.failed = false
    m.status.text = "Loading..."
    m.status.visible = true
    path = "/api/roku/title/" + m.top.mediaType + "/" + m.top.tmdbId.toStr()
    m.task = StartRequest({ path: path, query: { profile: m.top.profileId } }, "onDetailsLoaded")
end sub

sub onDetailsLoaded(event as object)
    response = event.getData()
    if not response.ok
        m.failed = true
        m.status.text = response.error + Chr(10) + "Press OK to try again."
        return
    end if

    d = response.data
    m.details = d
    m.saved = d.saved
    m.backdrop.uri = d.backdropUrl
    m.titleLabel.text = d.title
    m.meta.text = DetailMeta(d)
    m.genres.text = d.genresLine
    m.description.text = d.description
    m.credits.text = d.creditsLine
    m.cast.text = d.castLine
    StackLabels([m.titleLabel, m.meta, m.genres, m.description, m.credits, m.cast], 80, 16, "top")
    m.watchNote.text = d.watchNote

    showActions(0)

    hasSimilar = d.similar <> invalid and d.similar.count() > 0
    m.similarHeading.visible = hasSimilar
    m.similar.visible = hasSimilar
    if hasSimilar then m.similar.content = RowsToContent([{ title: "", items: d.similar }])

    m.status.visible = false
    m.body.visible = true
    if m.top.isInFocusChain() then m.actionList.setFocus(true)
end sub

' Rebuilds the buttons (they change when the title is saved or removed) and focuses one of them.
sub showActions(focusIndex as integer)
    m.actions = DetailActions(m.details, m.saved)
    m.actionList.content = LabelsToContent(ActionLabels(m.actions))
    if focusIndex >= m.actions.count() then focusIndex = m.actions.count() - 1
    m.actionList.jumpToItem = focusIndex
end sub

sub onActionSelected()
    if m.busy then return
    index = m.actionList.itemSelected
    if index < 0 or index >= m.actions.count() then return
    action = m.actions[index]
    if action.action = "save"
        toggleSaved(index)
    else
        openApp(action)
    end if
end sub

' Asks the Pi to tell this Roku to open the streaming app (or YouTube for the trailer).
sub openApp(action as object)
    ShowToast(LaunchHint(action, m.details.title))
    body = LaunchBody(DeviceIp(), action)
    m.launchTask = StartRequest({ method: "POST", path: "/api/roku/launch", body: body }, "onLaunched")
end sub

sub onLaunched(event as object)
    response = event.getData()
    if not response.ok then ShowToast(response.error)
end sub

sub toggleSaved(index as integer)
    m.busy = true
    m.pendingIndex = index
    method = "PUT"
    if m.saved then method = "DELETE"
    path = WatchlistPath(m.top.profileId, m.top.mediaType, m.top.tmdbId)
    m.saveTask = StartRequest({ method: method, path: path }, "onSaved")
end sub

sub onSaved(event as object)
    m.busy = false
    response = event.getData()
    if not response.ok
        ShowToast(response.error)
        return
    end if
    m.saved = not m.saved
    if m.saved
        ShowToast("Added to My List")
    else
        ShowToast("Removed from My List")
    end if
    showActions(m.pendingIndex)
    ' Tell the other screens My List changed.
    scene = m.top.getScene()
    scene.listVersion = scene.listVersion + 1
end sub

sub onSimilarSelected()
    position = m.similar.rowItemSelected
    item = m.similar.content.getChild(0).getChild(position[1])
    if item = invalid then return
    m.top.itemSelected = { mediaType: item.mediaType, tmdbId: item.tmdbId }
end sub

sub onFocusChanged()
    if m.top.hasFocus() then m.actionList.setFocus(true)
end sub

' Right from the buttons goes to "More like this"; left from its first poster comes back.
function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false
    if key = "OK" and m.failed
        onLoad()
        return true
    end if
    if key = "right" and m.actionList.isInFocusChain() and m.similar.visible
        m.similar.setFocus(true)
        return true
    end if
    if key = "left" and m.similar.isInFocusChain()
        m.actionList.setFocus(true)
        return true
    end if
    return false
end function
