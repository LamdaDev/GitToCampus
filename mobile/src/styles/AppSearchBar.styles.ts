import { StyleSheet } from 'react-native';

export const searchBar = StyleSheet.create({
  container: {
    backgroundColor: '#757575',
    paddingHorizontal: 10,
    opacity: 0.8,
    boxShadow: 'inset 0 -1.5px 4px rgba(0, 0, 0, 0.51)',
    alignSelf: 'center',
    borderRadius: 30,
    bottom: 30,
    width: '80%',
    position: 'absolute',
    height: '6.8%',
    borderBottomWidth: 0,
    borderTopWidth: 0,
  },
  inputContainer: {
    backgroundColor: '#646464',
    borderRadius: 30,
    height: '100%',
    paddingTop: 6,
  },
  inputText: {
    fontFamily: 'gabarito',
    color: '#ffffff',
  },
});
