import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Send, Sparkles, Phone, ShieldAlert, MapPin, Route, PhoneCall, Share2, Link2 } from 'lucide-react-native';
import { AppStackParamList } from '../../types/navigation.types';
import { colors, radii, spacing, typography } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { triggerSOSThunk } from '../../store/slices/sosSlice';
import { ChatAction, sendChat } from '../../services/chatApi';

type Props = NativeStackScreenProps<AppStackParamList, 'SathiChat'>;
interface Msg { id: string; role: 'user' | 'assistant'; text: string; actions?: ChatAction[]; followUps?: string[]; emergency?: boolean }

const STARTERS = ['I am being followed', 'How do I file a Zero FIR?', 'What are my rights?', 'Is this stalking?', 'Emergency numbers', 'Self-defence tips'];
const OFFLINE_REPLY = 'I can\'t reach the server right now, but here is what always works:\n• **112** — emergency (police/fire/ambulance)\n• **1091 / 181** — Women Helpline\n• **15100** — free legal aid\nIf you are in danger, press SOS or call 112.';

/** Minimal **bold** + bullet rendering so answers stay readable without a markdown library. */
function Rich({ text, color }: { text: string; color: string }) {
  return (
    <View>
      {text.split('\n').map((line, i) => (
        <Text key={i} style={[styles.msgText, { color }, line.startsWith('•') && { paddingLeft: 4 }]}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (part.startsWith('**') ? <Text key={j} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text> : <Text key={j}>{part}</Text>))}
        </Text>
      ))}
    </View>
  );
}

export function SathiChatScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.auth.user?.preferredLanguage ?? 'en');
  const [messages, setMessages] = useState<Msg[]>([{ id: 'hi', role: 'assistant', text: 'Hi, I\'m **Sathi**. Ask me about your rights, filing an FIR, staying safe — or tell me what\'s happening.', followUps: STARTERS }]);
  const [input, setInput] = useState(route.params?.prefill ?? '');
  const [busy, setBusy] = useState(false);
  const session = useRef(`s${Date.now().toString(36)}`).current;
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => { listRef.current?.scrollToEnd({ animated: true }); }, [messages, busy]);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput('');
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: t }]);
    setBusy(true);
    try {
      const r = await sendChat(t, session, language);
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', text: r.reply, actions: r.actions, followUps: r.followUps, emergency: r.emergency }]);
    } catch {
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', text: OFFLINE_REPLY, actions: [{ type: 'call', number: '112', label: 'Call 112' }] }]);
    } finally { setBusy(false); }
  }, [busy, language, session]);

  async function runAction(a: ChatAction) {
    switch (a.type) {
      case 'sos': { const r = await dispatch(triggerSOSThunk()); if (triggerSOSThunk.fulfilled.match(r)) navigation.replace('SOSActive'); break; }
      case 'call': void Linking.openURL(`tel:${a.number}`); break;
      case 'fake_call': navigation.navigate('FakeCall'); break;
      case 'safe_haven': navigation.navigate('SafeHaven'); break;
      case 'journey': navigation.navigate('GuardianJourney'); break;
      case 'share_location': navigation.navigate('ShareLocation'); break;
      case 'link': void Linking.openURL(a.url); break;
    }
  }

  const iconFor = (a: ChatAction) => {
    const c = a.type === 'sos' ? '#fff' : colors.primary;
    return a.type === 'sos' ? <ShieldAlert size={14} color={c} /> : a.type === 'call' ? <Phone size={14} color={c} /> : a.type === 'safe_haven' ? <MapPin size={14} color={c} /> : a.type === 'journey' ? <Route size={14} color={c} /> : a.type === 'fake_call' ? <PhoneCall size={14} color={c} /> : a.type === 'share_location' ? <Share2 size={14} color={c} /> : <Link2 size={14} color={c} />;
  };
  const labelFor = (a: ChatAction) => ({ sos: 'Send SOS now', call: a.type === 'call' ? a.label : '', fake_call: 'Fake call', safe_haven: 'Nearest safe place', journey: 'Start Guardian Journey', share_location: 'Share my location', link: a.type === 'link' ? a.label : '' }[a.type]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={{ marginBottom: spacing.md }}>
            <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot, item.emergency && styles.emergency]}>
              {item.role === 'assistant' ? <View style={styles.botHead}><Sparkles size={12} color={colors.primary} /><Text style={styles.botName}>Sathi</Text></View> : null}
              <Rich text={item.text} color={item.role === 'user' ? colors.textOnPrimary : colors.textPrimary} />
            </View>
            {item.actions?.length ? (
              <View style={styles.actions}>
                {item.actions.map((a, i) => (
                  <Pressable key={i} onPress={() => void runAction(a)} style={[styles.action, a.type === 'sos' && styles.actionSOS]}>
                    {iconFor(a)}<Text style={[styles.actionText, a.type === 'sos' && { color: '#fff' }]}>{labelFor(a)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {item.role === 'assistant' && index === messages.length - 1 && item.followUps?.length ? (
              <View style={styles.actions}>
                {item.followUps.map((f) => (<Pressable key={f} onPress={() => void send(f)} style={styles.chip}><Text style={styles.chipText}>{f}</Text></Pressable>))}
              </View>
            ) : null}
          </View>
        )}
        ListFooterComponent={busy ? <View style={[styles.bubble, styles.bot, { alignSelf: 'flex-start' }]}><ActivityIndicator color={colors.primary} /></View> : null}
      />
      <View style={styles.inputBar}>
        <TextInput value={input} onChangeText={setInput} placeholder="Type or describe what's happening…" placeholderTextColor={colors.textTertiary} style={styles.input} multiline maxLength={1000} onSubmitEditing={() => void send(input)} />
        <Pressable onPress={() => void send(input)} disabled={!input.trim() || busy} style={[styles.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]} accessibilityLabel="Send"><Send size={18} color={colors.textOnPrimary} /></Pressable>
      </View>
      <Text style={styles.disclaimer}>General information, not legal advice. In danger? Call 112.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.base },
  bubble: { maxWidth: '88%', borderRadius: radii.lg, padding: spacing.md },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.glassFillStrong, borderWidth: 1, borderColor: colors.glassBorder, borderBottomLeftRadius: 4 },
  emergency: { borderColor: colors.danger, backgroundColor: colors.dangerMuted },
  botHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  botName: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  msgText: { ...typography.body, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  actionSOS: { backgroundColor: colors.danger, borderColor: colors.danger },
  actionText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glassFill },
  chipText: { ...typography.caption, color: colors.textSecondary },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  input: { flex: 1, maxHeight: 110, ...typography.body, color: colors.textPrimary, backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.sm },
});
