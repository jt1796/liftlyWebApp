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
  Paper,
  Card,
  CardContent,
  Stack,
  Autocomplete,
  FormControl,
  Collapse,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { LineChart } from '@mui/x-charts/LineChart';
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
  getTemplates,
  saveTemplates,
  getCustomExercises,
  saveCustomExercises,
} from '../utils/database';
import { calculateAllPRs, calculateExerciseMetrics, getLatestExercisePRs } from '../utils';
import { exercises as builtInExercises } from '../data/exercises';
import type { Friendship, UserProfile, Workout, Template, CustomExercise } from '../types';
import { useTheme } from '@mui/material/styles';
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
          <Tooltip title="Remove friend">
            <span>
              <IconButton
                color="error"
                onClick={() => setIsConfirmOpen(true)}
                disabled={removeMutation.isPending}
                id={`remove-friend-${friendUid}`}
                size="small"
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
  const navigate = useNavigate();
  const theme = useTheme();

  const [codeInput, setCodeInput] = useState('');
  const [lookupProfile, setLookupProfile] = useState<UserProfile | null | 'not-found'>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [rmsToUse, setRmsToUse] = useState<Record<string, number>>({});
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
  const acceptedFriendUids = useMemo(() => accepted.map((f) =>
    f.requesterId === currentUser?.uid ? f.receiverId : f.requesterId
  ), [accepted, currentUser?.uid]);

  const { data: sharedData = { workouts: [] as Array<{ uid: string; workout: Workout }>, templates: [] as Array<{ uid: string; template: Template }>, customExercises: [] as Array<{ uid: string; exercise: CustomExercise }> }, isLoading: sharedLoading, error: sharedError } = useQuery({
    queryKey: ['friendsSharedContent', acceptedFriendUids],
    enabled: acceptedFriendUids.length > 0,
    queryFn: async () => {
      const perFriend = await Promise.all(acceptedFriendUids.map(async (uid) => {
        const [workouts, templates, customExercises] = await Promise.all([
          getWorkoutsForUser(uid), getTemplates(uid), getCustomExercises(uid),
        ]);
        return { uid, workouts, templates, customExercises };
      }));
      return {
        workouts: perFriend.flatMap(({ uid, workouts }) => workouts.map((workout) => ({ uid, workout })))
          .sort((a, b) => b.workout.date.getTime() - a.workout.date.getTime()),
        templates: perFriend.flatMap(({ uid, templates }) => templates.map((template) => ({ uid, template }))),
        customExercises: perFriend.flatMap(({ uid, customExercises }) => customExercises.map((exercise) => ({ uid, exercise }))),
      };
    },
  });

  const ownCustomQuery = useQuery({
    queryKey: ['customExercises', currentUser?.uid],
    queryFn: () => getCustomExercises(currentUser!.uid),
    enabled: !!currentUser,
  });
  const ownWorkoutsQuery = useQuery({
    queryKey: ['workouts', currentUser?.uid],
    queryFn: () => getWorkoutsForUser(currentUser!.uid),
    enabled: !!currentUser,
  });

  const importTemplateMutation = useMutation({
    mutationFn: async ({ uid, template }: { uid: string; template: Template }) => {
      const templates = await getTemplates(currentUser!.uid);
      const imported: Template = {
        ...template,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        name: `${template.name} (from ${profiles[uid]?.displayName ?? 'Friend'})`,
      };
      await saveTemplates(currentUser!.uid, [...templates, imported]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', currentUser?.uid] });
      setSnackbar('Template copied to your templates.');
    },
    onError: (error) => setSnackbar(`Could not copy template: ${(error as Error).message}`),
  });
  const copyExerciseMutation = useMutation({
    mutationFn: async (exercise: CustomExercise) => {
      const existing = await getCustomExercises(currentUser!.uid);
      if (existing.some((item) => item.name.toLocaleLowerCase() === exercise.name.toLocaleLowerCase())) return;
      await saveCustomExercises(currentUser!.uid, [...existing, exercise]);
    },
    onSuccess: (_, exercise) => {
      queryClient.invalidateQueries({ queryKey: ['customExercises', currentUser?.uid] });
      setSnackbar(`${exercise.name} added to your custom exercises.`);
    },
    onError: (error) => setSnackbar(`Could not copy exercise: ${(error as Error).message}`),
  });
  const customExerciseRows = sharedData.customExercises.filter(({ exercise }) =>
    ![...builtInExercises, ...(ownCustomQuery.data ?? []).map((item) => item.name)]
      .some((name) => name.toLocaleLowerCase() === exercise.name.toLocaleLowerCase())
  );
  const availableExercises = useMemo(() => Array.from(new Set([
    ...sharedData.workouts.flatMap(({ workout }) => workout.exercises.map((exercise) => exercise.name)),
    ...(ownWorkoutsQuery.data ?? []).flatMap((workout) => workout.exercises.map((exercise) => exercise.name)),
  ])).sort(), [sharedData.workouts, ownWorkoutsQuery.data]);
  const workoutHistoryByLifter = useMemo(() => [
    ...(currentUser ? [{ uid: currentUser.uid, workouts: ownWorkoutsQuery.data ?? [] }] : []),
    ...acceptedFriendUids.map((uid) => ({
      uid,
      workouts: sharedData.workouts.filter((item) => item.uid === uid).map((item) => item.workout),
    })),
  ], [currentUser, ownWorkoutsQuery.data, acceptedFriendUids, sharedData.workouts]);
  const getLifterName = (uid: string) => uid === currentUser?.uid
    ? currentUser.displayName ?? 'You'
    : profiles[uid]?.displayName ?? 'Friend';
  const recordsByFriend = useMemo(() => selectedExercise ? workoutHistoryByLifter.map(({ uid, workouts }) => ({
    uid, workouts, metrics: calculateExerciseMetrics(workouts, selectedExercise),
  })).filter((item) => item.metrics.length > 0) : [], [selectedExercise, workoutHistoryByLifter]);
  const selectedExercisePRs = selectedExercise ? workoutHistoryByLifter.flatMap(({ uid, workouts }) => {
    return calculateAllPRs(workouts)
      .filter((pr) => pr.exerciseName === selectedExercise && pr.oldValue !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map((pr) => ({ ...pr, uid }));
  }).sort((a, b) => b.date.getTime() - a.date.getTime()) : [];
  const recordChartDates = useMemo(() => Array.from(new Map(
    recordsByFriend.flatMap(({ metrics }) => metrics.map((point) => [point.date.getTime(), point.date] as const))
  ).values()).sort((a, b) => a.getTime() - b.getTime()), [recordsByFriend]);
  const recordChartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  const handleStartTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const initialRms: Record<string, number> = {};
    Array.from(new Set(template.exercises.map((exercise) => exercise.name))).forEach((name) => {
      initialRms[name] = getLatestExercisePRs(ownWorkoutsQuery.data ?? [], name).e1rm?.value || 0;
    });
    setRmsToUse(initialRms);
  };

  const confirmStartTemplate = () => {
    if (!selectedTemplate) return;
    const workoutFromTemplate = {
      title: selectedTemplate.name,
      date: new Date(),
      exercises: selectedTemplate.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          weight: Math.round(((set.weight / 100) * (rmsToUse[exercise.name] || 0)) / 5) * 5,
        })),
      })),
    };
    localStorage.setItem('liftly-currentWorkout', JSON.stringify(workoutFromTemplate));
    navigate('/workout');
  };

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* ─── Friends List ─────────────────────────────────────────── */}
      {friendshipsLoading && <CircularProgress sx={{ display: 'block', my: 2 }} />}
      {friendshipsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(friendshipsError as Error).message}
        </Alert>
      )}

      {!friendshipsLoading && (
        <>
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexWrap: 'wrap', gap: 1, my: 1.5 }}>
            {['Friends', 'Workouts', 'Templates', 'Custom Exercises', 'Records'].map((label, index) => <Button
              key={label}
              size="small"
              variant={tab === index ? 'contained' : 'outlined'}
              onClick={() => setTab(index)}
              aria-pressed={tab === index}
              sx={{ borderRadius: 999, minWidth: 0, px: 1.75 }}
            >{label}</Button>)}
          </Box>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 1, display: { xs: 'none', sm: 'flex' } }}
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
            <Tab id="tab-workouts" label="Workouts" />
            <Tab label="Templates" />
            <Tab label="Custom Exercises" />
            <Tab label="Records" />
          </Tabs>

          <Divider />

          {tab === 0 && <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 1 }}>
              <Typography variant="h6">Your friends</Typography>
            </Box>
            {accepted.length === 0 ? <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>No friends yet. Share your invite code below to get started.</Paper> :
              <List disablePadding sx={{ display: 'grid', gap: 1.5 }}>{accepted.map((f) => <Paper key={f.id} variant="outlined" sx={{ overflow: 'hidden' }}><FriendRow friendship={f} currentUid={currentUser.uid} profiles={profiles} /></Paper>)}</List>}
            {pending.length > 0 && <Box sx={{ mt: 3 }}><Typography variant="h6" sx={{ mb: 1 }}>Friend requests <Chip label={pending.length} color="warning" size="small" sx={{ ml: 1 }} /></Typography><List disablePadding sx={{ display: 'grid', gap: 1 }}>{pending.map((f) => <Paper key={f.id} variant="outlined"><FriendRow friendship={f} currentUid={currentUser.uid} profiles={profiles} /></Paper>)}</List></Box>}
            <Accordion defaultExpanded variant="outlined" sx={{ mt: 3 }} id="invite-add-friend-accordion">
              <AccordionSummary expandIcon={<ExpandMoreIcon />} id="invite-add-friend-header"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonAddIcon color="primary"/><Typography fontWeight={700}>Add a friend or share your code</Typography></Box></AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Your invite code</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Share this code so a friend can send you a request.</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}><TextField value={formatInviteCode(currentUser.uid)} fullWidth size="small" inputProps={{ readOnly: true, id: 'invite-code-field' }}/><Button id="copy-invite-code-btn" variant="contained" startIcon={<ContentCopyIcon />} onClick={handleCopyCode}>Copy</Button></Box>
                <Divider sx={{ mb: 2 }}/><Typography variant="subtitle2" fontWeight={700} gutterBottom>Add a friend</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Enter their invite code to send a request.</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}><TextField id="friend-code-input" label="Friend's invite code" value={codeInput} onChange={(e) => { setCodeInput(e.target.value); setLookupProfile(null); }} fullWidth size="small" onKeyDown={(e) => e.key === 'Enter' && handleLookup()}/><Button id="lookup-friend-btn" variant="outlined" onClick={handleLookup} disabled={!codeInput.trim() || lookupLoading}>{lookupLoading ? <CircularProgress size={20}/> : 'Look up'}</Button></Box>
                {lookupProfile === 'not-found' && <Alert severity="error">No user found with that invite code.</Alert>}
                {lookupProfile && lookupProfile !== 'not-found' && <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Avatar src={lookupProfile.photoURL ?? undefined}>{(lookupProfile.displayName ?? '?')[0].toUpperCase()}</Avatar><Typography sx={{ flex: 1 }}>{lookupProfile.displayName ?? 'Unknown user'}</Typography>{alreadyFriends(lookupProfile.uid) ? <Chip label="Already friends / requested" size="small"/> : <Button id="send-friend-request-btn" variant="contained" startIcon={<PersonAddIcon/>} onClick={() => sendRequestMutation.mutate(lookupProfile.uid)} disabled={sendRequestMutation.isPending}>{sendRequestMutation.isPending ? 'Sending…' : 'Add Friend'}</Button>}</Box>}
                {sendRequestMutation.isError && <Alert severity="error" sx={{ mt: 1 }}>{(sendRequestMutation.error as Error).message}</Alert>}
              </AccordionDetails>
            </Accordion>
          </>}
          {tab > 0 && sharedError && <Alert severity="error" sx={{ mt: 2 }}>{(sharedError as Error).message}</Alert>}
          {tab > 0 && sharedLoading && <CircularProgress sx={{ my: 3 }} />}
          {tab === 1 && !sharedLoading && <Stack spacing={1.5} sx={{ mt: 2 }}>
            {sharedData.workouts.length === 0 ? <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>No friend workouts to show yet.</Paper> : sharedData.workouts.map(({ uid, workout }) => {
              const workoutId = `${uid}-${workout.id ?? workout.date.getTime()}`;
              const isExpanded = expandedWorkoutId === workoutId;
              const friendWorkouts = sharedData.workouts.filter((item) => item.uid === uid).map((item) => item.workout);
              const workoutPRs = calculateAllPRs(friendWorkouts).filter((pr) =>
                pr.oldValue !== null && pr.date.getTime() === workout.date.getTime()
              );
              return <Card variant="outlined" key={workoutId}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedWorkoutId(isExpanded ? null : workoutId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpandedWorkoutId(isExpanded ? null : workoutId);
                      }
                    }}
                    sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2, cursor: 'pointer' }}
                  >
                    <Avatar src={profiles[uid]?.photoURL ?? undefined}>{(profiles[uid]?.displayName ?? '?')[0].toUpperCase()}</Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={700}>{workout.title || workout.exercises.map((item) => item.name).join(', ') || 'Workout'}</Typography>
                      <Typography variant="body2" color="text.secondary">{profiles[uid]?.displayName ?? 'Friend'} · {workout.date.toLocaleDateString()} · {workout.exercises.length} exercises</Typography>
                      <Typography variant="caption" color="text.secondary">{workout.exercises.map((item) => item.name).join(' · ')}</Typography>
                    </Box>
                    {workoutPRs.length > 0 && <Tooltip title={<Box sx={{ p: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.75rem' }}>Personal Records Broken:</Typography>
                      {workoutPRs.map((pr, index) => <Typography key={`${pr.exerciseName}-${pr.type}-${index}`} variant="caption" display="block">• {pr.exerciseName} ({pr.type}): {pr.oldValue} → {pr.value} lbs</Typography>)}
                    </Box>} arrow>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 0.5 }}>
                        <WorkspacePremiumIcon sx={{ color: '#FFD700' }} />
                        {workoutPRs.length > 1 && <Typography component="sup" sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#FFD700', ml: 0.25, alignSelf: 'flex-start', lineHeight: 1, mt: -0.25 }}>{workoutPRs.length}</Typography>}
                      </Box>
                    </Tooltip>}
                    {isExpanded ? <ExpandLessIcon color="action" /> : <ExpandMoreIcon color="action" />}
                  </Box>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Divider />
                    <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                      {workout.exercises.map((exercise, exerciseIndex) => {
                        const exercisePRs = workoutPRs.filter((pr) => pr.exerciseName === exercise.name);
                        return <Box key={`${exercise.name}-${exerciseIndex}`} sx={{ mb: exerciseIndex < workout.exercises.length - 1 ? 1.5 : 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight={700}>{exercise.name}</Typography>
                          {exercisePRs.map((pr, prIndex) => <Chip key={`${pr.type}-${prIndex}`} label={`${pr.type}: ${pr.oldValue} → ${pr.value} lb`} size="small" color="warning" variant="outlined" />)}
                        </Box>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                          {exercise.sets.map((set, setIndex) => <Chip key={set.id ?? setIndex} label={`${set.weight} lb × ${set.reps}`} size="small" variant="outlined" />)}
                        </Stack>
                      </Box>})}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>;
            })}
          </Stack>}
          {tab === 2 && !sharedLoading && <Stack spacing={3} sx={{ mt: 2 }}>{sharedData.templates.length === 0 ? <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>No friend templates to show yet.</Paper> : acceptedFriendUids.map((uid) => {
            const friendTemplates = sharedData.templates.filter((item) => item.uid === uid);
            if (friendTemplates.length === 0) return null;
            return <Box key={uid}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                <Avatar src={profiles[uid]?.photoURL ?? undefined} sx={{ width: 32, height: 32 }}>{(profiles[uid]?.displayName ?? '?')[0].toUpperCase()}</Avatar>
                <Typography variant="h6">{profiles[uid]?.displayName ?? 'Friend'}</Typography>
                <Chip label={friendTemplates.length} size="small" />
              </Box>
              <Stack spacing={1.5}>{friendTemplates.map(({ template }, index) => {
                const templateId = `${uid}-${template.id ?? template.name}-${index}`;
                const isExpanded = expandedTemplateId === templateId;
                return <Card variant="outlined" key={templateId}>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700}>{template.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{template.exercises.length} exercises</Typography>
                      </Box>
                      <Tooltip title="Start workout from template"><IconButton color="primary" onClick={() => handleStartTemplate(template)} id={`start-workout-${templateId}`}><PlayArrowIcon /></IconButton></Tooltip>
                      <Tooltip title="Copy to My Templates"><span><IconButton color="secondary" onClick={() => importTemplateMutation.mutate({ uid, template })} disabled={importTemplateMutation.isPending} id={`copy-template-${templateId}`}><ContentCopyIcon /></IconButton></span></Tooltip>
                      <Tooltip title={isExpanded ? 'Hide template details' : 'View template details'}><IconButton onClick={() => setExpandedTemplateId(isExpanded ? null : templateId)} id={`view-template-${templateId}`}>{isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton></Tooltip>
                    </Box>
                  </CardContent>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Divider />
                    <Stack spacing={1.25} sx={{ p: 2 }}>
                      {template.exercises.map((exercise, exerciseIndex) => <Box key={`${exercise.name}-${exerciseIndex}`}>
                        <Typography variant="body2" fontWeight={700}>{exercise.name}</Typography>
                        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>{exercise.sets.map((set, setIndex) => <Chip key={set.id ?? setIndex} label={`${set.weight}% × ${set.reps} reps`} size="small" variant="outlined" />)}</Stack>
                      </Box>)}
                    </Stack>
                  </Collapse>
                </Card>;
              })}</Stack>
            </Box>;
          })}</Stack>}
          {tab === 3 && !sharedLoading && <Box sx={{ mt: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>Custom exercises shared by friends that aren’t in your exercise library.</Typography>
            {customExerciseRows.length === 0 ? <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>No new custom exercises from friends.</Paper> : <Stack spacing={1}>{acceptedFriendUids.map((uid) => {
              const friendExercises = customExerciseRows.filter((item) => item.uid === uid);
              if (friendExercises.length === 0) return null;
              return <Accordion key={uid} variant="outlined">
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={profiles[uid]?.photoURL ?? undefined} sx={{ width: 30, height: 30 }}>{(profiles[uid]?.displayName ?? '?')[0].toUpperCase()}</Avatar>
                    <Typography fontWeight={700}>{profiles[uid]?.displayName ?? 'Friend'}</Typography>
                    <Chip label={friendExercises.length} size="small" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Stack spacing={1}>{friendExercises.map(({ exercise }, index) => <Paper key={`${exercise.name}-${index}`} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight={600} sx={{ flex: 1 }}>{exercise.name}</Typography>
                    <Tooltip title="Copy to My Custom Exercises"><span><IconButton aria-label={`Copy ${exercise.name}`} onClick={() => copyExerciseMutation.mutate(exercise)} disabled={copyExerciseMutation.isPending} color="primary"><ContentCopyIcon /></IconButton></span></Tooltip>
                  </Paper>)}</Stack>
                </AccordionDetails>
              </Accordion>;
            })}</Stack>}
          </Box>}
          {tab === 4 && !sharedLoading && <Box sx={{ mt: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>Choose an exercise to compare each friend’s training history.</Typography>
            <FormControl fullWidth sx={{ mb: 3 }}><Autocomplete value={selectedExercise} options={availableExercises} onChange={(_, value) => setSelectedExercise(value)} renderInput={(params) => <TextField {...params} label="Search exercise" />}/></FormControl>
            {!selectedExercise ? <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>Select an exercise to see workout history.</Paper> : recordsByFriend.length === 0 ? <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>No friend has logged {selectedExercise} yet.</Paper> : <Card variant="outlined"><CardContent>
              <Typography variant="h6" fontWeight={700}>{selectedExercise} · Estimated 1RM</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Each line shows one friend’s training history.</Typography>
              <LineChart
                xAxis={[{ data: recordChartDates, scaleType: 'time', valueFormatter: (date) => date.toLocaleDateString() }]}
                series={recordsByFriend.map(({ uid, metrics }, index) => ({
                  id: uid,
                  label: getLifterName(uid),
                  data: recordChartDates.map((date) => metrics.find((point) => point.date.getTime() === date.getTime())?.estimatedOneRepMax ?? null),
                  color: recordChartColors[index % recordChartColors.length],
                }))}
                height={360}
                slotProps={{ legend: { direction: 'horizontal', position: { vertical: 'bottom', horizontal: 'center' } } }}
              />
              <Typography variant="h6" fontWeight={700} sx={{ mt: 2, mb: 1 }}>Personal records</Typography>
              {selectedExercisePRs.length === 0 ? <Typography color="text.secondary">No PRs recorded for this exercise yet.</Typography> : <Stack spacing={1}>{selectedExercisePRs.map((pr, index) => <Paper key={`${pr.uid}-${pr.date.getTime()}-${pr.type}-${index}`} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography fontWeight={700} sx={{ flex: 1 }}>{getLifterName(pr.uid)}</Typography>
                <Chip label={pr.type} size="small" />
                <Typography>{pr.oldValue} → {pr.value} lb</Typography>
                <Typography variant="body2" color="text.secondary">{pr.date.toLocaleDateString()}</Typography>
              </Paper>)}</Stack>}
            </CardContent></Card>}
          </Box>}
        </>
      )}

      {selectedTemplate && <Dialog open onClose={() => setSelectedTemplate(null)} fullWidth maxWidth="xs">
        <DialogTitle>Enter 1RMs for Workout</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>Enter your current 1 Rep Max for each exercise to calculate the weights for this session.</Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>{Object.keys(rmsToUse).map((name) => <TextField key={name} label={`${name} 1RM`} type="number" value={rmsToUse[name]} onChange={(event) => setRmsToUse((previous) => ({ ...previous, [name]: parseFloat(event.target.value) || 0 }))} fullWidth />)}</Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTemplate(null)}>Cancel</Button>
          <Button onClick={confirmStartTemplate} variant="contained">Start</Button>
        </DialogActions>
      </Dialog>}

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
