import { useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Chip,
  Tooltip,
  Tab,
  Tabs,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import ConstructionIcon from '@mui/icons-material/Construction';
import TerminalIcon from '@mui/icons-material/Terminal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context-utils';
import {
  getFriendships,
  getUserProfile,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getWorkoutsForUser,
} from '../utils/database';
import type { Friendship, UserProfile } from '../types';
import WorkoutHeatmap from './WorkoutHeatmap';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format a raw UID into groups of 7 chars for readability */
const formatInviteCode = (uid: string): string =>
  uid.match(/.{1,7}/g)?.join('-') ?? uid;

interface FriendRowProps {
  friendship: Friendship;
  currentUid: string;
  profiles: Record<string, UserProfile>;
}

const FriendRow = ({ friendship, currentUid, profiles }: FriendRowProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const friendUid =
    friendship.requesterId === currentUid
      ? friendship.receiverId
      : friendship.requesterId;

  const profile = profiles[friendUid];
  const displayName = profile?.displayName ?? friendUid.slice(0, 10) + '…';
  const isIncoming = friendship.receiverId === currentUid;

  const acceptMutation = useMutation({
    mutationFn: () => acceptFriendRequest(currentUid, friendship.requesterId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendships'] }),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeFriendship(currentUid, friendUid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendships'] }),
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['workouts', friendUid],
    queryFn: () => getWorkoutsForUser(friendUid),
    enabled: friendship.status === 'accepted',
  });

  if (friendship.status === 'pending') {
    return (
      <ListItem
        divider
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 1, sm: 0 },
          py: { xs: 1.5, sm: 1 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <ListItemAvatar>
            <Avatar src={profile?.photoURL ?? undefined} alt={displayName}>
              {displayName[0]?.toUpperCase()}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={displayName}
            secondary={isIncoming ? 'Wants to be your friend' : 'Request sent'}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            ml: { xs: 7, sm: 'auto' },
            mt: { xs: 0.5, sm: 0 },
          }}
        >
          {isIncoming && (
            <Tooltip title="Accept">
              <span>
                <IconButton
                  color="success"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  id={`accept-friend-${friendUid}`}
                >
                  <CheckIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title={isIncoming ? 'Decline' : 'Cancel'}>
            <span>
              <IconButton
                color="error"
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
                id={`decline-friend-${friendUid}`}
              >
                <CloseIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </ListItem>
    );
  }

  // Accepted friend
  return (
    <ListItem
      divider
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        py: 1.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <ListItemAvatar>
            <Avatar src={profile?.photoURL ?? undefined} alt={displayName}>
              {displayName[0]?.toUpperCase()}
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={displayName} />
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            ml: { xs: 7, sm: 'auto' },
            mt: { xs: 0.5, sm: 0 },
            flexWrap: 'wrap',
          }}
        >
          <Tooltip title="View workouts">
            <IconButton
              onClick={() => navigate(`/friends/${friendUid}/workouts`)}
              id={`view-workouts-${friendUid}`}
            >
              <FitnessCenterIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="View templates">
            <IconButton
              onClick={() => navigate(`/friends/${friendUid}/templates`)}
              id={`view-templates-${friendUid}`}
            >
              <ConstructionIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="View scripts">
            <IconButton
              onClick={() => navigate(`/friends/${friendUid}/scripts`)}
              id={`view-scripts-${friendUid}`}
            >
              <TerminalIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="View records">
            <IconButton
              onClick={() => navigate(`/friends/${friendUid}/records`)}
              id={`view-records-${friendUid}`}
            >
              <QueryStatsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove friend">
            <span>
              <IconButton
                color="error"
                onClick={() => setIsConfirmOpen(true)}
                disabled={removeMutation.isPending}
                id={`remove-friend-${friendUid}`}
              >
                <PersonRemoveIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Heatmap below user name */}
      <Box sx={{ mt: 1, width: '100%' }}>
        {workoutsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <WorkoutHeatmap workouts={workouts || []} />
        )}
      </Box>

      <Dialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        aria-labelledby={`remove-friend-title-${friendUid}`}
        aria-describedby={`remove-friend-desc-${friendUid}`}
      >
        <DialogTitle id={`remove-friend-title-${friendUid}`}>
          Remove Friend
        </DialogTitle>
        <DialogContent>
          <DialogContentText id={`remove-friend-desc-${friendUid}`}>
            Are you sure you want to remove {displayName} from your friends list?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              removeMutation.mutate();
              setIsConfirmOpen(false);
            }}
            color="error"
            variant="contained"
            autoFocus
            id={`confirm-remove-friend-${friendUid}`}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </ListItem>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const FriendsPage = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [codeInput, setCodeInput] = useState('');
  const [lookupProfile, setLookupProfile] = useState<UserProfile | null | 'not-found'>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const {
    data: friendships = [],
    isLoading: friendshipsLoading,
    error: friendshipsError,
  } = useQuery({
    queryKey: ['friendships', currentUser?.uid],
    queryFn: () => getFriendships(currentUser!.uid),
    enabled: !!currentUser,
  });

  // Collect all friend UIDs so we can batch-fetch their profiles
  const friendUids = useMemo(() => {
    if (!currentUser) return [];
    return friendships.map((f) =>
      f.requesterId === currentUser.uid ? f.receiverId : f.requesterId
    );
  }, [friendships, currentUser]);

  const { data: profiles = {} } = useQuery({
    queryKey: ['friendProfiles', friendUids],
    queryFn: async () => {
      const entries = await Promise.all(
        friendUids.map(async (uid) => {
          const p = await getUserProfile(uid);
          return [uid, p] as [string, UserProfile | null];
        })
      );
      return Object.fromEntries(entries.filter(([, p]) => p !== null)) as Record<
        string,
        UserProfile
      >;
    },
    enabled: friendUids.length > 0,
  });

  const sendRequestMutation = useMutation({
    mutationFn: (friendUid: string) =>
      sendFriendRequest(currentUser!.uid, friendUid),
    onSuccess: () => {
      setCodeInput('');
      setLookupProfile(null);
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      setSnackbar('Friend request sent!');
    },
  });

  const pending = friendships.filter((f) => f.status === 'pending');
  const accepted = friendships.filter((f) => f.status === 'accepted');

  // ─── Code lookup ─────────────────────────────────────────────────────────

  const handleLookup = async () => {
    const trimmed = codeInput.replace(/-/g, '').trim();
    if (!trimmed || !currentUser) return;
    if (trimmed === currentUser.uid) {
      setLookupProfile('not-found');
      return;
    }
    setLookupLoading(true);
    setLookupProfile(null);
    try {
      const profile = await getUserProfile(trimmed);
      setLookupProfile(profile ?? 'not-found');
    } finally {
      setLookupLoading(false);
    }
  };

  const alreadyFriends = (uid: string) =>
    friendships.some(
      (f) => f.requesterId === uid || f.receiverId === uid
    );

  const handleCopyCode = () => {
    if (!currentUser) return;
    navigator.clipboard.writeText(currentUser.uid);
    setSnackbar('Invite code copied!');
  };

  if (!currentUser) return null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Friends
      </Typography>

      {/* ─── Friends List ─────────────────────────────────────────── */}
      {friendshipsLoading && <CircularProgress sx={{ display: 'block', my: 2 }} />}
      {friendshipsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(friendshipsError as Error).message}
        </Alert>
      )}

      {!friendshipsLoading && (
        <>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mb: 1 }}
            id="friends-tabs"
          >
            <Tab
              id="tab-accepted"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Friends
                  {accepted.length > 0 && (
                    <Chip label={accepted.length} size="small" />
                  )}
                </Box>
              }
            />
            <Tab
              id="tab-pending"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Pending
                  {pending.length > 0 && (
                    <Chip label={pending.length} color="warning" size="small" />
                  )}
                </Box>
              }
            />
          </Tabs>

          <Divider />

          {tab === 0 && (
            <List disablePadding>
              {accepted.length === 0 ? (
                <Typography
                  color="text.secondary"
                  sx={{ p: 2, textAlign: 'center' }}
                >
                  No friends yet. Expand the section below to share your invite code and get started!
                </Typography>
              ) : (
                accepted.map((f) => (
                  <FriendRow
                    key={f.id}
                    friendship={f}
                    currentUid={currentUser.uid}
                    profiles={profiles}
                  />
                ))
              )}
            </List>
          )}

          {tab === 1 && (
            <List disablePadding>
              {pending.length === 0 ? (
                <Typography
                  color="text.secondary"
                  sx={{ p: 2, textAlign: 'center' }}
                >
                  No pending requests.
                </Typography>
              ) : (
                pending.map((f) => (
                  <FriendRow
                    key={f.id}
                    friendship={f}
                    currentUid={currentUser.uid}
                    profiles={profiles}
                  />
                ))
              )}
            </List>
          )}
        </>
      )}

      {/* ─── Expandable Invite Code / Add Friend Box ─────────────── */}
      <Accordion variant="outlined" sx={{ mt: 4, mb: 2 }} id="invite-add-friend-accordion">
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          id="invite-add-friend-header"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon color="primary" />
            <Typography variant="subtitle1" fontWeight="bold">
              Add Friend / Share Invite Code
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 3, pb: 3 }}>
          {/* Your Invite Code */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Your Invite Code
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Share this code with a friend. They can paste it below to send you a
              friend request.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                value={formatInviteCode(currentUser.uid)}
                fullWidth
                size="small"
                inputProps={{ readOnly: true, id: 'invite-code-field' }}
                sx={{ fontFamily: 'monospace' }}
              />
              <Tooltip title="Copy code">
                <Button
                  id="copy-invite-code-btn"
                  variant="contained"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyCode}
                  sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Copy
                </Button>
              </Tooltip>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Add a Friend */}
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Add a Friend
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your friend's invite code to send them a request.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                id="friend-code-input"
                label="Friend's invite code"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setLookupProfile(null);
                }}
                fullWidth
                size="small"
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
              <Button
                id="lookup-friend-btn"
                variant="outlined"
                onClick={handleLookup}
                disabled={!codeInput.trim() || lookupLoading}
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {lookupLoading ? <CircularProgress size={20} /> : 'Look up'}
              </Button>
            </Box>

            {lookupProfile === 'not-found' && (
              <Alert severity="error">No user found with that invite code.</Alert>
            )}

            {lookupProfile && lookupProfile !== 'not-found' && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Avatar
                  src={lookupProfile.photoURL ?? undefined}
                  alt={lookupProfile.displayName ?? ''}
                >
                  {(lookupProfile.displayName ?? '?')[0].toUpperCase()}
                </Avatar>
                <Typography sx={{ flex: 1 }}>
                  {lookupProfile.displayName ?? 'Unknown user'}
                </Typography>
                {alreadyFriends(lookupProfile.uid) ? (
                  <Chip label="Already friends / requested" size="small" />
                ) : (
                  <Button
                    id="send-friend-request-btn"
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => sendRequestMutation.mutate(lookupProfile.uid)}
                    disabled={sendRequestMutation.isPending}
                  >
                    {sendRequestMutation.isPending ? 'Sending…' : 'Add Friend'}
                  </Button>
                )}
              </Box>
            )}

            {sendRequestMutation.isError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {(sendRequestMutation.error as Error).message}
              </Alert>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Container>
  );
};

export default FriendsPage;
