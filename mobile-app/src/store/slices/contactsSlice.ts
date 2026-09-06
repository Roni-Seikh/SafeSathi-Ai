import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as contactApi from '../../services/contactApi';
import { EmergencyContact } from '../../types/api.types';

interface ContactsState {
  items: EmergencyContact[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ContactsState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchContacts = createAsyncThunk('contacts/fetchAll', () => contactApi.listContacts());

export const createContact = createAsyncThunk('contacts/create', (payload: contactApi.ContactPayload) =>
  contactApi.addContact(payload)
);

export const editContact = createAsyncThunk(
  'contacts/edit',
  ({ id, payload }: { id: string; payload: Partial<contactApi.ContactPayload> }) =>
    contactApi.updateContact(id, payload)
);

export const removeContact = createAsyncThunk('contacts/remove', async (id: string) => {
  await contactApi.deleteContact(id);
  return id;
});

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Could not load emergency contacts';
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.items.sort((a, b) => a.priority - b.priority);
      })
      .addCase(editContact.fulfilled, (state, action) => {
        const index = state.items.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        state.items.sort((a, b) => a.priority - b.priority);
      })
      .addCase(removeContact.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c._id !== action.payload);
      });
  },
});

export default contactsSlice.reducer;
