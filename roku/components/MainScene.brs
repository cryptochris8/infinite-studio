sub init()
    m.screens = m.top.findNode("screens")
    m.startup = m.top.findNode("startup")
    m.nav = m.top.findNode("nav")
    m.navList = m.top.findNode("navList")
    m.toastGroup = m.top.findNode("toastGroup")
    m.toastLabel = m.top.findNode("toastLabel")
    m.toastTimer = m.top.findNode("toastTimer")

    m.navList.observeField("itemSelected", "onNavSelected")
    m.toastTimer.observeField("fire", "onToastTimer")

    m.stack = []
    m.rootName = ""
    m.navItems = []
    m.profiles = []
    m.profileId = 0
    m.profileName = ""
    m.startupFailed = false
    m.forcePicker = false

    m.top.setFocus(true)
    loadProfiles()
end sub

' Startup, and "Profile" in the menu: fetch the profiles, then pick one or ask who's watching.
sub loadProfiles()
    m.startupFailed = false
    if m.stack.count() = 0
        m.startup.text = "Connecting to multistream..."
        m.startup.visible = true
    end if
    m.profilesTask = StartRequest({ path: "/api/profiles" }, "onProfilesLoaded")
end sub

sub onProfilesLoaded(event as object)
    response = event.getData()
    if not response.ok
        if m.stack.count() > 0
            ShowToast(response.error)
            return
        end if
        m.startupFailed = true
        m.startup.text = response.error + Chr(10) + "Server: " + AppConfig().apiBase + Chr(10) + "Press OK to try again."
        m.top.setFocus(true)
        return
    end if

    m.startup.visible = false
    m.profiles = response.data
    if m.forcePicker
        m.forcePicker = false
        showRoot("profiles")
        return
    end if

    index = FindProfileIndex(m.profiles, ReadSavedProfileId())
    if index < 0 and m.profiles.count() = 1 then index = 0
    if index >= 0
        useProfile(m.profiles[index])
        showRoot("home")
    else
        showRoot("profiles")
    end if
end sub

sub useProfile(profile as object)
    m.profileId = profile.id
    m.profileName = profile.name
    SaveProfileId(profile.id)
end sub

sub onProfileChosen(event as object)
    useProfile(event.getData())
    showRoot("home")
end sub

' Replaces everything on screen with one of the menu's screens.
sub showRoot(name as string)
    m.screens.removeChildrenIndex(m.screens.getChildCount(), 0)
    m.stack = []
    m.rootName = name

    if name = "home"
        screen = createRowsScreen("home")
    else if name = "movies"
        screen = createRowsScreen("movie")
    else if name = "shows"
        screen = createRowsScreen("tv")
    else if name = "mylist"
        screen = CreateObject("roSGNode", "GridScreen")
        screen.profileId = m.profileId
        screen.profileName = m.profileName
        screen.listVersion = m.top.listVersion
    else if name = "search"
        screen = CreateObject("roSGNode", "SearchScreen")
    else
        screen = CreateObject("roSGNode", "ProfileScreen")
        screen.currentId = m.profileId
        screen.profiles = m.profiles
        screen.observeField("profileChosen", "onProfileChosen")
        pushScreen(screen)
        return
    end if

    screen.observeField("itemSelected", "onItemSelected")
    pushScreen(screen)
    screen.load = true
end sub

function createRowsScreen(mode as string) as object
    screen = CreateObject("roSGNode", "RowsScreen")
    screen.mode = mode
    screen.profileId = m.profileId
    screen.listVersion = m.top.listVersion
    return screen
end function

' A poster was chosen somewhere: open its detail screen on top.
sub onItemSelected(event as object)
    item = event.getData()
    detail = CreateObject("roSGNode", "DetailScreen")
    detail.mediaType = item.mediaType
    detail.tmdbId = item.tmdbId
    detail.profileId = m.profileId
    detail.observeField("itemSelected", "onItemSelected")
    pushScreen(detail)
    detail.load = true
end sub

sub pushScreen(screen as object)
    if m.stack.count() > 0 then m.stack.peek().visible = false
    m.screens.appendChild(screen)
    m.stack.push(screen)
    screen.setFocus(true)
end sub

sub popScreen()
    top = m.stack.pop()
    m.screens.removeChild(top)
    previous = m.stack.peek()
    previous.visible = true
    ' Let Home or My List reload if a title was saved or removed on the screen we just left.
    if previous.hasField("listVersion") then previous.listVersion = m.top.listVersion
    previous.setFocus(true)
end sub

sub showNav()
    m.navItems = NavItems(m.profileName)
    labels = []
    for each item in m.navItems
        labels.push(item.title)
    end for
    m.navList.content = LabelsToContent(labels)
    index = NavIndex(m.navItems, m.rootName)
    if index < 0 then index = 1
    m.navList.jumpToItem = index
    m.nav.visible = true
    m.navList.setFocus(true)
end sub

sub hideNav()
    m.nav.visible = false
    if m.stack.count() > 0 then m.stack.peek().setFocus(true)
end sub

sub onNavSelected()
    target = m.navItems[m.navList.itemSelected].target
    m.nav.visible = false
    if target = "profiles"
        m.forcePicker = true
        loadProfiles()
    else
        showRoot(target)
    end if
end sub

sub onToast()
    m.toastLabel.text = m.top.toast
    m.toastGroup.visible = true
    m.toastTimer.control = "stop"
    m.toastTimer.control = "start"
end sub

sub onToastTimer()
    m.toastGroup.visible = false
end sub

' Keys the screens didn't use. Back pops a detail screen, or opens the menu on a main screen;
' Back with the menu open leaves the app. Left at the edge of a main screen also opens the menu.
function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false

    if m.startupFailed
        if key = "OK"
            loadProfiles()
            return true
        end if
        return false
    end if

    if m.nav.visible
        if key = "right" or key = "options"
            hideNav()
            return true
        end if
        return false
    end if

    if m.stack.count() > 1
        if key = "back"
            popScreen()
            return true
        end if
        return false
    end if

    ' Still choosing the first profile: Back leaves the app.
    if m.profileId = 0 then return false

    if key = "back" or key = "left" or key = "options"
        showNav()
        return true
    end if
    return false
end function
