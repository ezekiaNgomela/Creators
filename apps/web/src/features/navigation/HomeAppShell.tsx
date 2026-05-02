import { useEffect, useMemo, useState } from "react";
import {
  addUsersToChatRoom,
  createCallSession,
  createChatRoom,
  createComment,
  createPost,
  fetchChatContacts,
  fetchChatMessages,
  fetchChatUsers,
  fetchComments,
  fetchFeed,
  fetchLiveIndex,
  fetchNotifications,
  fetchPost,
  fetchProfile,
  markNotificationsRead,
  rateLiveRoom,
  sendChatMessage,
  updatePost,
  updateProfile,
  uploadMedia,
  type AuthUser,
  type CallSession,
  type ChatContact,
  type ChatMessage,
  type ChatUser,
  type Comment,
  type FeedPost,
  type HealthResponse,
  type LiveIndex,
  type LiveRating,
  type LiveRoom,
  type Notification,
  type PostInput,
  type ProfileResponse,
} from "../../api";
import { StoryHeader } from "../home/StoryHeader";
import { HomeFeed } from "../home/HomeFeed";
import { StreamScreen } from "../live-stream/StreamScreen";
import { SearchMessages } from "../chat/SearchMessages";
import { StudioPanel } from "../studio/StudioPanel";
import { PostEditPanel } from "../studio/PostEditPanel";
import { ProfilePanel } from "../profile/ProfilePanel";
import { ProfileServicePage, profileServices, type ProfileServiceId } from "../profile/services";
import { ProfileSettingsPanel } from "../settings/ProfileSettingsPanel";
import { PublicProfileScreen } from "../profile/PublicProfileScreen";
import { DesktopSidebar } from "./DesktopSidebar";
import { BottomNav } from "./BottomNav";
import { AppTopBar } from "./AppTopBar";
import { NotificationDrawer } from "../notifications/NotificationDrawer";
import { createDisplayPosts, indexFor } from "../../shared/helpers";
import { themeOptions } from "../../shared/theme";
import type { DisplayPost, FeedMode, HomeTab, ProfileView, ThemeName } from "../../shared/types";

export function HomeAppShell({
  health,
  notice,
  onThemeChange,
  serviceLabel,
  theme,
  user,
  onDismissNotice,
  onLogout,
}: {
  health: HealthResponse | null;
  notice: string;
  onThemeChange: (theme: ThemeName) => void;
  serviceLabel: string;
  theme: ThemeName;
  user: AuthUser;
  onDismissNotice: () => void;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<HomeTab>("home");
  const [chatContacts, setChatContacts] = useState<ChatContact[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [feedError, setFeedError] = useState("");
  const [feedMode, setFeedMode] = useState<FeedMode>("Trend");
  const [followCounts, setFollowCounts] = useState<Record<string, number>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [editingPost, setEditingPost] = useState<DisplayPost | null>(null);
  const [liveIndex, setLiveIndex] = useState<LiveIndex | null>(null);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [callStatus, setCallStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileView, setProfileView] = useState<ProfileView>("profile");
  const [activeProfileServiceId, setActiveProfileServiceId] = useState<ProfileServiceId | null>(null);
  const [selectedProfilePost, setSelectedProfilePost] = useState<DisplayPost | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingPostId, setPendingPostId] = useState<number | null>(() => readSharedPostId());

  const displayPosts = useMemo(() => createDisplayPosts(posts), [posts]);
  const homePosts = useMemo(() => {
    const sorted = [...displayPosts];
    if (feedMode === "Local") {
      return sorted.sort((left, right) => {
        const leftOwn = left.author.id === user.id ? 1 : 0;
        const rightOwn = right.author.id === user.id ? 1 : 0;
        return rightOwn - leftOwn || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
    }
    if (feedMode === "Global") {
      return sorted.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    }
    return sorted.sort((left, right) => right.promotionScore - left.promotionScore || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [displayPosts, feedMode, user.id]);
  const selectedLive = liveRooms.find((room) => room.id === selectedLiveId) ?? liveRooms[0] ?? null;
  const activeProfileService = activeProfileServiceId ? profileServices.find((service) => service.id === activeProfileServiceId) ?? null : null;
  const ratingsByLiveId = useMemo(() => {
    const ratings = new Map<number, LiveRating>();
    liveIndex?.ratings.forEach((rating) => ratings.set(rating.liveRoomId, rating));
    return ratings;
  }, [liveIndex]);

  async function loadFeed() {
    setLoading(true);
    setFeedError("");
    try {
      const [feed, nextLiveIndex, nextProfile, nextContacts, nextChatUsers, nextNotifications] = await Promise.all([
        fetchFeed(),
        fetchLiveIndex(),
        fetchProfile(),
        fetchChatContacts(),
        fetchChatUsers(),
        fetchNotifications(),
      ]);
      setLiveRooms(feed.liveRooms);
      setPosts(feed.posts);
      setLiveIndex(nextLiveIndex);
      setProfile(nextProfile);
      setChatContacts(nextContacts);
      setChatUsers(nextChatUsers);
      setNotifications(nextNotifications);

      const nextThreadId = nextContacts.some((contact) => contact.id === selectedThreadId)
        ? selectedThreadId
        : nextContacts[0]?.id ?? "";
      setSelectedThreadId(nextThreadId);
      setChatMessages(nextThreadId ? await fetchChatMessages(nextThreadId) : []);
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : "Could not load feed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
  }, []);

  useEffect(() => {
    if (!pendingPostId || loading) {
      return;
    }

    const existingPost = displayPosts.find((post) => post.id === pendingPostId);
    if (existingPost) {
      setSelectedProfilePost(existingPost);
      setActiveTab("home");
      setPendingPostId(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const post = await fetchPost(pendingPostId);
        if (cancelled) {
          return;
        }
        setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
        setSelectedProfilePost(createDisplayPosts([post])[0]);
        setActiveTab("home");
      } catch (err) {
        if (!cancelled) {
          setFeedError(err instanceof Error ? err.message : "Could not open shared post.");
        }
      } finally {
        if (!cancelled) {
          setPendingPostId(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [displayPosts, loading, pendingPostId]);

  function openStream(room: LiveRoom) {
    setSelectedLiveId(room.id);
    setActiveTab("streams");
  }

  function followKey(value: string) {
    return value.trim().toLowerCase();
  }

  function isFollowing(value: string) {
    return Boolean(followingMap[followKey(value)]);
  }

  function followersFor(value: string) {
    const key = followKey(value);
    return followCounts[key] ?? 1200 + indexFor(value, 8200);
  }

  function toggleFollow(value: string) {
    const key = followKey(value);
    setFollowingMap((current) => {
      const next = !current[key];
      setFollowCounts((counts) => ({
        ...counts,
        [key]: Math.max(1, (counts[key] ?? 1200 + indexFor(value, 8200)) + (next ? 1 : -1)),
      }));
      return { ...current, [key]: next };
    });
  }

  async function loadPostComments(postId: number) {
    setComments(await fetchComments("post", postId));
  }

  async function addPostComment(postId: number, body: string) {
    const comment = await createComment({ targetType: "post", targetId: postId, body });
    setComments((current) => [...current, comment]);
  }

  async function loadLiveComments(liveId: number) {
    setComments(await fetchComments("live", liveId));
  }

  async function addLiveComment(liveId: number, body: string) {
    const comment = await createComment({ targetType: "live", targetId: liveId, body });
    setComments((current) => [...current, comment]);
  }

  async function updateLiveRating(liveRoomId: number, score: number) {
    const rating = await rateLiveRoom({ liveRoomId, score });
    setLiveIndex((current) => {
      if (!current) {
        return current;
      }
      const ratings = current.ratings.filter((item) => item.liveRoomId !== liveRoomId);
      return { ...current, ratings: [...ratings, rating] };
    });
  }

  async function openThread(contactId: string) {
    setSelectedThreadId(contactId);
    setChatMessages(await fetchChatMessages(contactId));
  }

  async function createDirectChat(participantId: number) {
    const room = await createChatRoom({ type: "direct", participantIds: [participantId] });
    setChatContacts(await fetchChatContacts());
    await openThread(room.id);
  }

  async function createGroupChat(title: string, participantIds: number[]) {
    const room = await createChatRoom({ type: "group", title, participantIds });
    setChatContacts(await fetchChatContacts());
    await openThread(room.id);
  }

  async function addUsersToSelectedChat(participantIds: number[]) {
    if (!selectedThreadId) {
      return;
    }
    await addUsersToChatRoom({ roomId: selectedThreadId, participantIds });
    setChatContacts(await fetchChatContacts());
  }

  async function sendMessage(body: string) {
    if (!selectedThreadId) {
      return;
    }
    const message = await sendChatMessage({ contactId: selectedThreadId, body });
    setChatMessages((current) => [...current, message]);
    setChatContacts(await fetchChatContacts());
  }

  async function saveProfile(input: { name: string; bio: string; headline: string; location: string; avatarUrl?: string; coverUrl?: string; websiteUrl?: string }) {
    const nextProfile = await updateProfile(input);
    setProfile(nextProfile);
    setPosts((current) => current.map((post) => (post.author.id === nextProfile.user.id ? { ...post, author: nextProfile.user } : post)));
  }

  async function publishStudioPost(input: PostInput) {
    const post = await createPost(input);
    setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setNotifications(await fetchNotifications());
    return post;
  }

  async function updateStudioPost(postId: number, input: PostInput) {
    const post = await updatePost(postId, input);
    setPosts((current) => current.map((item) => (item.id === post.id ? post : item)));
    setNotifications(await fetchNotifications());
    return post;
  }

  async function uploadStudioFile(file: File) {
    return uploadMedia(file);
  }

  async function copyOwnProfileLink() {
    await navigator.clipboard?.writeText(`${window.location.origin}/?profile=${profile?.user.id ?? user.id}`);
  }

  async function openNotifications() {
    setNotificationOpen((value) => !value);
    if (!notificationOpen) {
      await markNotificationsRead();
      setNotifications(await fetchNotifications());
    }
  }

  async function startThreadCall(mode: "voice" | "video") {
    if (!selectedThreadId) {
      setCallStatus("Open a chat first.");
      return;
    }
    setCallStatus(`Starting ${mode} call...`);
    try {
      const call = await createCallSession({ roomId: selectedThreadId, mode });
      setActiveCall(call);
      setCallStatus(`${mode === "video" ? "Video" : "Voice"} call room #${call.id} is ready.`);
      setNotifications(await fetchNotifications());
    } catch (err) {
      setCallStatus(err instanceof Error ? err.message : "Could not start call.");
    }
  }

  async function startLiveMeeting(room: LiveRoom, mode: "voice" | "video") {
    const roomId = selectedThreadId || chatContacts[0]?.id || "";
    if (!roomId) {
      setCallStatus("Create a chat room before starting a live meeting.");
      setActiveTab("messages");
      return;
    }

    setCallStatus(`Opening ${mode} room for ${room.title}...`);
    try {
      const call = await createCallSession({ roomId, mode });
      setActiveCall(call);
      setCallStatus(`${mode === "video" ? "Video meeting" : "Voice room"} #${call.id} is ready for ${room.host}.`);
      setNotifications(await fetchNotifications());
    } catch (err) {
      setCallStatus(err instanceof Error ? err.message : "Could not start the live meeting.");
    }
  }

  function changeTab(tab: HomeTab) {
    if (tab === "streams") {
      setSelectedLiveId(null);
    }
    if (tab === "profiles") {
      setProfileView("profile");
      setActiveProfileServiceId(null);
    }
    setActiveTab(tab);
    setSidebarOpen(false);
  }

  function openProfileService(serviceId: ProfileServiceId) {
    setActiveProfileServiceId(serviceId);
    setProfileView("service");
  }

  const unreadNotifications = notifications.filter((notification) => !notification.readAt).length;

  return (
    <main className={`social-shell tab-${activeTab} ${sidebarOpen ? "sidebar-open" : ""}`}>
      {activeTab === "studio" ? null : (
        <AppTopBar
          activeTab={activeTab}
          notificationCount={unreadNotifications}
          profileTitle={activeTab === "profiles" ? profileView === "settings" ? "Settings" : profileView === "service" ? activeProfileService?.label ?? "Services" : "Profile" : undefined}
          profileView={profileView}
          sidebarOpen={sidebarOpen}
          onLogoClick={() => setSidebarOpen((value) => !value)}
          onOpenMessages={() => changeTab("messages")}
          onOpenNotifications={() => void openNotifications()}
          onOpenProfile={() => changeTab("profiles")}
        />
      )}

      {notificationOpen ? (
        <div className="app-notification-layer">
          <NotificationDrawer notifications={notifications} />
        </div>
      ) : null}

      {sidebarOpen ? <button className="app-sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} /> : null}

      {selectedProfilePost || editingPost ? null : (
        <DesktopSidebar
          activeTab={activeTab}
          health={health}
          notificationCount={unreadNotifications}
          onTabChange={changeTab}
          user={profile?.user ?? user}
        />
      )}
      <div className="app-outlet">
        <section className={`phone-frame tab-${activeTab} ${activeTab === "profiles" ? `profile-view-${profileView}` : ""}`}>
          {editingPost ? (
            <PostEditPanel
              post={editingPost}
              onBack={() => setEditingPost(null)}
              onSave={updateStudioPost}
              onShareHome={() => {
                setEditingPost(null);
                setActiveTab("home");
              }}
            />
          ) : selectedProfilePost ? (
            <PublicProfileScreen
              post={selectedProfilePost}
              onBack={() => setSelectedProfilePost(null)}
              chatUsers={chatUsers}
              onOpenPost={setSelectedProfilePost}
              posts={displayPosts}
            />
          ) : activeTab === "home" ? (
            <>
              <StoryHeader
                liveRooms={liveRooms}
                onCreateStory={() => changeTab("studio")}
                onFeedModeChange={setFeedMode}
                onOpenProfile={() => changeTab("profiles")}
                onOpenStream={openStream}
                feedMode={feedMode}
                user={user}
              />
              {feedError ? <p className="feed-error">{feedError}</p> : null}
              <HomeFeed
                comments={comments}
                isFollowing={isFollowing}
                loading={loading}
                onAddComment={addPostComment}
                onLoadComments={loadPostComments}
                onOpenProfile={setSelectedProfilePost}
                onToggleFollow={toggleFollow}
                posts={homePosts}
              />
            </>
          ) : null}

          {activeTab === "streams" ? (
            <StreamScreen
              comments={comments}
              liveIndex={liveIndex}
              liveRooms={liveRooms}
              onAddComment={addLiveComment}
              onClose={() => setActiveTab("home")}
              onLoadComments={loadLiveComments}
              onOpenStream={openStream}
              onRate={updateLiveRating}
              onStartLiveCall={startLiveMeeting}
              onToggleFollow={toggleFollow}
              ratingsByLiveId={ratingsByLiveId}
              selectedLive={selectedLive}
              followersFor={followersFor}
              isFollowing={isFollowing}
              activeCall={activeCall}
              callStatus={callStatus}
            />
          ) : null}

          {activeTab === "messages" ? (
            <SearchMessages
              chatUsers={chatUsers}
              contacts={chatContacts}
              messages={chatMessages}
              onAddUsersToRoom={addUsersToSelectedChat}
              onCreateDirectChat={createDirectChat}
              onCreateGroupChat={createGroupChat}
              onOpenProfile={() => changeTab("profiles")}
              onOpenThread={openThread}
              onSendMessage={sendMessage}
              onStartCall={startThreadCall}
              onToggleFollow={toggleFollow}
              selectedThreadId={selectedThreadId}
              activeCall={activeCall}
              callStatus={callStatus}
              isFollowing={isFollowing}
            />
          ) : null}

          {activeTab === "studio" ? (
            <StudioPanel
              onCreatePost={publishStudioPost}
              onExitStudio={() => changeTab("home")}
              onUploadMedia={uploadStudioFile}
              posts={displayPosts}
              serviceLabel={serviceLabel}
            />
          ) : null}

          {activeTab === "profiles" && profileView === "profile" ? (
            <ProfilePanel
              health={health}
              chatUsers={chatUsers}
              onEditPost={setEditingPost}
              onLogout={onLogout}
              onOpenSettings={() => setProfileView("settings")}
              onOpenPost={setSelectedProfilePost}
              onOpenService={openProfileService}
              onStartCreating={() => changeTab("studio")}
              posts={displayPosts}
              profile={profile}
              user={profile?.user ?? user}
              followersCount={followersFor(user.name)}
              followingCount={Object.values(followingMap).filter(Boolean).length + 42}
            />
          ) : null}

          {activeTab === "profiles" && profileView === "service" && activeProfileServiceId ? (
            <ProfileServicePage
              onBack={() => {
                setActiveProfileServiceId(null);
                setProfileView("profile");
              }}
              onCopyProfileLink={() => void copyOwnProfileLink()}
              onOpenSettings={() => setProfileView("settings")}
              onStartCreating={() => changeTab("studio")}
              posts={displayPosts.filter((post) => post.author.id === (profile?.user.id ?? user.id))}
              profile={profile}
              serviceId={activeProfileServiceId}
              user={profile?.user ?? user}
            />
          ) : null}

          {activeTab === "profiles" && profileView === "settings" ? (
            <ProfileSettingsPanel
              onBack={() => setProfileView("profile")}
              onLogout={onLogout}
              onSaveProfile={saveProfile}
              onUploadMedia={uploadStudioFile}
              profile={profile}
              theme={theme}
              themes={themeOptions}
              onThemeChange={onThemeChange}
              user={profile?.user ?? user}
            />
          ) : null}

          {selectedProfilePost || editingPost ? null : <BottomNav activeTab={activeTab} onTabChange={changeTab} />}
        </section>
      </div>

      {notice ? (
        <div className="toast" role="status">
          {notice}
          <button type="button" aria-label="Dismiss message" onClick={onDismissNotice}>
            x
          </button>
        </div>
      ) : null}
    </main>
  );
}

function readSharedPostId() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const fromQuery = Number(params.get("post") || params.get("p"));
  if (Number.isFinite(fromQuery) && fromQuery > 0) {
    return fromQuery;
  }

  const match = window.location.pathname.match(/^\/post\/(\d+)/);
  if (!match) {
    return null;
  }

  const fromPath = Number(match[1]);
  return Number.isFinite(fromPath) && fromPath > 0 ? fromPath : null;
}
