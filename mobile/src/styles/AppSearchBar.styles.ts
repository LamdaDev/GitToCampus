import { StyleSheet } from 'react-native';

export const searchBar = StyleSheet.create({
  container: {
    backgroundColor: '#912338',
    paddingHorizontal: 10,
    paddingVertical: 10,
    opacity: 0.75,
    boxShadow: 'inset 0 -1.5px 4px rgba(0, 0, 0, 0.51)',
    alignSelf: 'center',
    borderRadius: 50,
    bottom: 30,
    width: '85%',
    position: 'absolute',
    borderBottomWidth: 0,
    borderTopWidth: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#773c46',
    borderRadius: 30,
    height: '100%',
    paddingHorizontal: 10,
    paddingVertical: 2,
    gap: 7,
  },

  font: {
    fontFamily: 'gabarito',
    color: '#ffffff',
    fontSize: 20,
  },
});
