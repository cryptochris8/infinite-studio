sub init()
    m.list = m.top.findNode("list")
    m.list.observeField("itemSelected", "onSelected")
    m.top.observeField("focusedChild", "onFocusChanged")
end sub

sub onProfiles()
    names = []
    for each profile in m.top.profiles
        names.push(profile.name)
    end for
    m.list.content = LabelsToContent(names)
    current = FindProfileIndex(m.top.profiles, m.top.currentId)
    if current >= 0 then m.list.jumpToItem = current
end sub

sub onSelected()
    profile = m.top.profiles[m.list.itemSelected]
    if profile <> invalid then m.top.profileChosen = { id: profile.id, name: profile.name }
end sub

sub onFocusChanged()
    if m.top.hasFocus() then m.list.setFocus(true)
end sub
