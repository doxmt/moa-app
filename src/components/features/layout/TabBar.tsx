import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, Heart, Home, MessageCircle, Star } from 'lucide-react-native';

type TabBarProps = {
  state: { index: number; routes: { name: string; key: string }[] };
  navigation: { navigate: (name: string) => void };
};

const TABS = [
  { name: 'home', label: '홈', Icon: Home, fillWhenActive: true },
  { name: 'calendar', label: '캘린더', Icon: Calendar, fillWhenActive: false },
  { name: 'recommend', label: '추천', Icon: Star, fillWhenActive: false },
  { name: 'story', label: '스토리', Icon: Heart, fillWhenActive: false },
  { name: 'question', label: '질문', Icon: MessageCircle, fillWhenActive: false },
];

export default function TabBar({ state, navigation }: TabBarProps) {
  return (
    <View style={styles.container}>
      {TABS.map(({ name, label, Icon, fillWhenActive }, index) => {
        const isFocused = state.index === index;
        const color = isFocused ? '#222222' : '#AAAAAA';

        return (
          <TouchableOpacity
            key={name}
            style={styles.tab}
            onPress={() => navigation.navigate(name)}
            activeOpacity={0.7}
          >
            <Icon
              size={24}
              color={color}
              strokeWidth={1.8}
              fill={fillWhenActive && isFocused ? '#222222' : 'none'}
            />
            <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    height: 64,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
  },
  labelActive: {
    color: '#222222',
    fontWeight: '500',
  },
  labelInactive: {
    color: '#AAAAAA',
  },
});
