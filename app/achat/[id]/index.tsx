import { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';

import { getDb } from '../../../src/db/init'; 
import { useTheme } from '../../context/ThemeContext'; 

const NEUTRALS = {
  bg: '#F3F4F6',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#10B981'
};

export default function AchatDetails() {
  // 🎨 THEME DYNAMIQUE
  const { activeTheme } = useTheme();
  const s = getStyles(activeTheme);
  
  const achatId = Number(useLocalSearchParams<{ id?: string }>().id);
  
  // --- ÉTATS ---
  const [achat, setAchat] = useState<any>(null);
  const [lignes, setLignes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [newItem, setNewItem] = useState('');
  
  // Modals
  const [editModal, setEditModal] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [editData, setEditData] = useState({ nom: '', qty: '', prix: '', unite: 'pcs' });
  const [quickModal, setQuickModal] = useState(false);
  const [quickIdx, setQuickIdx] = useState(-1);
  const [quickData, setQuickData] = useState({ qty: '1', prix: '', unite: 'pcs' });
  const [deleteModal, setDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [editNameIdx, setEditNameIdx] = useState(-1);
  const [editNameValue, setEditNameValue] = useState('');

  // --- CHARGEMENT ---
  useEffect(() => {
    if (!achatId) return;
    loadData();
  }, [achatId]);

  const loadData = () => {
    try {
      const db = getDb();
      const [a] = db.getAllSync(`SELECT * FROM Achat WHERE id = ?`, [achatId]);
      if (!a) return;
      setAchat(a);
      setTitle(a.nomListe);
      const items = db.getAllSync(`SELECT * FROM LigneAchat WHERE idAchat = ? ORDER BY id ASC`, [achatId]);
      setLignes(items.map((l: any) => ({ ...l, checked: l.quantite > 0 && l.prixUnitaire > 0 })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- ACTIONS ---
  const saveTitle = () => {
    if (!title.trim()) return;
    getDb().runSync('UPDATE Achat SET nomListe = ? WHERE id = ?', [title, achatId]);
    setAchat({ ...achat, nomListe: title });
    setEditTitle(false);
  };

  const addItem = () => {
    const nom = newItem.trim();
    if (!nom) return;
    const db = getDb();
    const r = db.runSync('INSERT INTO LigneAchat (idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, 0, 0, 0, "pcs")', [achatId, nom]);
    setLignes([...lignes, { id: r.lastInsertRowId, libelleProduit: nom, quantite: 0, prixUnitaire: 0, prixTotal: 0, unite: 'pcs', checked: false }]);
    setNewItem('');
  };

  const toggle = (item: any) => {
    const idx = lignes.findIndex(l => l.id === item.id);
    const l = lignes[idx];
    if (!l.checked) {
      setQuickIdx(idx);
      setQuickData({ qty: '1', prix: '', unite: l.unite || 'pcs' });
      setQuickModal(true);
    } else {
      lignes[idx] = { ...l, quantite: 0, prixUnitaire: 0, prixTotal: 0, checked: false };
      setLignes([...lignes]);
      if (l.id) getDb().runSync('UPDATE LigneAchat SET quantite=0, prixUnitaire=0, prixTotal=0 WHERE id=?', [l.id]);
    }
  };

  const saveQuick = () => {
    const qty = parseFloat(quickData.qty) || 0;
    const prix = parseFloat(quickData.prix) || 0;
    const total = qty * prix;
    const l = lignes[quickIdx];
    if (l.id) getDb().runSync('UPDATE LigneAchat SET quantite=?, prixUnitaire=?, prixTotal=?, unite=? WHERE id=?', [qty, prix, total, quickData.unite, l.id]);
    lignes[quickIdx] = { ...l, quantite: qty, prixUnitaire: prix, prixTotal: total, unite: quickData.unite, checked: true };
    setLignes([...lignes]);
    setQuickModal(false);
  };

  const askDelete = (item: any) => {
    setItemToDelete(item);
    setDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    getDb().runSync('DELETE FROM LigneAchat WHERE id=?', [itemToDelete.id]);
    const newLignes = lignes.filter(l => l.id !== itemToDelete.id);
    setLignes(newLignes);
    setDeleteModal(false);
    setItemToDelete(null);
    // Raha foana ny entana, dia mijanona eo ihany (tsy miverina)
  };

  const saveRename = () => {
     const nom = editNameValue.trim();
     if(nom && editNameIdx !== -1) {
        const l = lignes[editNameIdx];
        getDb().runSync('UPDATE LigneAchat SET libelleProduit = ? WHERE id = ?', [nom, l.id]);
        lignes[editNameIdx].libelleProduit = nom;
        setLignes([...lignes]);
        setEditNameIdx(-1);
     }
  };

  const saveEdit = () => {
    const qty = parseFloat(editData.qty) || 0;
    const prix = parseFloat(editData.prix) || 0;
    const nom = editData.nom.trim();
    const total = qty * prix;
    const l = lignes[editIdx];
    getDb().runSync('UPDATE LigneAchat SET libelleProduit=?, quantite=?, prixUnitaire=?, prixTotal=?, unite=? WHERE id=?', [nom, qty, prix, total, editData.unite, l.id]);
    lignes[editIdx] = { ...l, libelleProduit: nom, quantite: qty, prixUnitaire: prix, prixTotal: total, unite: editData.unite, checked: true };
    setLignes([...lignes]);
    setEditModal(false);
  };

  const unchecked = lignes.filter(l => !l.checked);
  const checked = lignes.filter(l => l.checked);
  const totalDepense = checked.reduce((sum, l) => sum + l.prixTotal, 0);
  const progress = lignes.length > 0 ? checked.length / lignes.length : 0;

  if (loading) return <ActivityIndicator style={s.center} color={activeTheme.primary} />;
  if (!achat) return null;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* HEADER */}
      <LinearGradient colors={activeTheme.gradient as any} style={s.header}>
        <View style={s.headerContent}>
           <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
           </TouchableOpacity>
           <View style={{ flex: 1, marginHorizontal: 10 }}>
               {editTitle ? (
                   <TextInput style={s.titleInput} value={title} onChangeText={setTitle} onBlur={saveTitle} autoFocus />
               ) : (
                   <TouchableOpacity onPress={() => setEditTitle(true)}>
                       <Text style={s.headerTitle} numberOfLines={1}>{achat.nomListe}</Text>
                       <Text style={s.headerDate}>{format(new Date(achat.dateAchat), 'dd MMMM yyyy', {locale: fr})}</Text>
                   </TouchableOpacity>
               )}
           </View>
           <TouchableOpacity onPress={() => router.push('/rapports')} style={s.backBtn}>
              <Ionicons name="pie-chart-outline" size={22} color="#fff" />
           </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* TOTAL CARD */}
      <View style={s.summaryContainer}>
         <View style={s.summaryCard}>
            <View style={s.summaryRow}>
                <View>
                    <Text style={s.summaryLabel}>TOTAL DÉPENSÉ</Text>
                    <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{totalDepense.toLocaleString()} Ar</Text>
                </View>
                <View style={[s.iconBox, { backgroundColor: activeTheme.secondary }]}>
                    <Ionicons name="wallet-outline" size={24} color={activeTheme.primary} />
                </View>
            </View>
            <View style={s.progressContainer}>
                <View style={s.progressTextRow}>
                    <Text style={s.progressText}>Avancement</Text>
                    <Text style={s.progressText}>{checked.length}/{lignes.length}</Text>
                </View>
                <View style={s.progressBarBg}>
                    <LinearGradient colors={activeTheme.gradient as any} style={[s.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
            </View>
         </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
         
         {/* LISTE À ACHETER */}
         <View style={s.section}>
             <Text style={s.sectionTitle}>À ACHETER ({unchecked.length})</Text>
             {unchecked.map((item) => {
                 const idx = lignes.indexOf(item);
                 return (
                     <View key={item.id} style={s.todoItem}>
                        <TouchableOpacity onPress={() => toggle(item)} style={[s.checkBox, { borderColor: activeTheme.primary }]} />
                        
                        {editNameIdx === idx ? (
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                <TextInput style={[s.inlineInput, { borderBottomColor: activeTheme.primary }]} value={editNameValue} onChangeText={setEditNameValue} autoFocus onSubmitEditing={saveRename} />
                                <Ionicons name="checkmark" size={20} color={activeTheme.primary} onPress={saveRename} />
                            </View>
                        ) : (
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => { setEditNameIdx(idx); setEditNameValue(item.libelleProduit); }}>
                                <Text style={s.itemText}>{item.libelleProduit}</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity onPress={() => askDelete(item)} style={s.miniDeleteBtn}>
                            <Ionicons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                     </View>
                 );
             })}

             {/* BARRE D'AJOUT */}
             <View style={[s.addItemRow, { borderColor: activeTheme.primary }]}>
                <Ionicons name="add" size={24} color={activeTheme.primary} />
                <TextInput 
                    style={s.addItemInput} placeholder="Ajouter un article..." placeholderTextColor={NEUTRALS.textLight}
                    value={newItem} onChangeText={setNewItem} onSubmitEditing={addItem}
                />
                {newItem.length > 0 && (
                    <TouchableOpacity onPress={addItem}><Text style={[s.addBtnText, { color: activeTheme.primary }]}>OK</Text></TouchableOpacity>
                )}
             </View>
         </View>

         {/* LISTE ACHETÉS */}
         {checked.length > 0 && (
             <View style={s.section}>
                 <Text style={s.sectionTitle}>DÉJÀ ACHETÉ ({checked.length})</Text>
                 {checked.map((item) => {
                     const idx = lignes.indexOf(item);
                     return (
                         <View key={item.id} style={[s.doneItem, { backgroundColor: '#fff' }]}>
                             <View style={s.doneHeader}>
                                 <TouchableOpacity onPress={() => toggle(item)}>
                                     <Ionicons name="checkmark-circle" size={22} color={NEUTRALS.success} />
                                 </TouchableOpacity>
                                 <Text style={s.doneText} numberOfLines={1}>{item.libelleProduit}</Text>
                                 <Text style={[s.doneTotal, { color: activeTheme.primary }]}>{item.prixTotal.toLocaleString()} Ar</Text>
                             </View>
                             
                             <View style={s.doneFooter}>
                                 <Text style={s.doneSub}>{item.quantite} {item.unite} x {item.prixUnitaire.toLocaleString()}</Text>
                                 
                                 <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity 
                                      style={[s.actionBtn, { backgroundColor: activeTheme.primary + '15' }]}
                                      onPress={() => { setEditIdx(idx); setEditData({ nom: item.libelleProduit, qty: item.quantite.toString(), prix: item.prixUnitaire.toString(), unite: item.unite || 'pcs' }); setEditModal(true); }}
                                    >
                                        <Ionicons name="create-outline" size={16} color={activeTheme.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                      style={[s.actionBtn, { backgroundColor: NEUTRALS.dangerLight }]}
                                      onPress={() => askDelete(item)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={NEUTRALS.danger} />
                                    </TouchableOpacity>
                                 </View>
                             </View>
                         </View>
                     );
                 })}
             </View>
         )}
      </ScrollView>

      {/* MODAL SUPPRESSION */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={s.backdrop}>
           <View style={s.deleteCard}>
              <View style={s.deleteIconContainer}>
                 <Ionicons name="trash" size={32} color={NEUTRALS.danger} />
              </View>
              <Text style={s.deleteTitle}>Supprimer l'article ?</Text>
              <View style={s.deleteActions}>
                 <TouchableOpacity style={s.btnCancel} onPress={() => setDeleteModal(false)}>
                    <Text style={s.btnCancelText}>Annuler</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={s.btnDelete} onPress={confirmDelete}>
                    <Text style={s.btnDeleteText}>Supprimer</Text>
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>

      {/* MODAL EDITION */}
      <Modal visible={editModal} transparent animationType="fade">
         <View style={s.backdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalContainer}>
               <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Modifier l'article</Text>
                  <TouchableOpacity onPress={() => setEditModal(false)} style={{ padding: 5 }}>
                     <Ionicons name="close" size={24} color={NEUTRALS.textLight} />
                  </TouchableOpacity>
               </View>
               <Text style={s.label}>Nom</Text>
               <TextInput style={s.inputBox} value={editData.nom} onChangeText={t => setEditData({...editData, nom: t})} />
               <View style={s.row}>
                   <View style={{ flex: 1 }}>
                       <Text style={s.label}>Quantité</Text>
                       <TextInput style={s.inputBox} value={editData.qty} onChangeText={t => setEditData({...editData, qty: t})} keyboardType="numeric" />
                   </View>
                   <View style={{ flex: 1 }}>
                       <Text style={s.label}>Prix</Text>
                       <TextInput style={s.inputBox} value={editData.prix} onChangeText={t => setEditData({...editData, prix: t})} keyboardType="numeric" />
                   </View>
               </View>
               <TouchableOpacity onPress={saveEdit} style={[s.btnPrimary, { backgroundColor: activeTheme.primary, marginTop: 20, width: '100%', alignItems: 'center' }]}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sauvegarder</Text>
               </TouchableOpacity>
            </KeyboardAvoidingView>
         </View>
      </Modal>

      {/* MODAL RAPIDE */}
      <Modal visible={quickModal} transparent animationType="fade">
         <View style={s.backdrop}>
            <View style={s.modalContainer}>
               <Text style={s.modalTitle}>Combien ?</Text>
               <View style={s.row}>
                   <View style={{ flex: 1 }}>
                       <Text style={s.label}>Quantité</Text>
                       <TextInput style={s.inputBox} value={quickData.qty} onChangeText={t => setQuickData({...quickData, qty: t})} keyboardType="numeric" autoFocus />
                   </View>
                   <View style={{ flex: 1 }}>
                       <Text style={s.label}>Prix</Text>
                       <TextInput style={s.inputBox} value={quickData.prix} onChangeText={t => setQuickData({...quickData, prix: t})} keyboardType="numeric" />
                   </View>
               </View>
               <TouchableOpacity onPress={saveQuick} style={[s.btnPrimary, { backgroundColor: activeTheme.primary, marginTop: 20, width: '100%', alignItems: 'center' }]}>
                  <Text style={{color:'#fff', fontWeight:'bold'}}>Valider</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: NEUTRALS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 60, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  titleInput: { fontSize: 20, fontWeight: 'bold', color: '#fff', borderBottomWidth: 1, borderColor: '#fff' },
  headerDate: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  summaryContainer: { marginTop: -40, paddingHorizontal: 20, marginBottom: 10 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  summaryLabel: { fontSize: 12, color: NEUTRALS.textLight, fontWeight: 'bold', letterSpacing: 1 },
  summaryValue: { fontSize: 28, fontWeight: '800' },
  iconBox: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  progressContainer: { gap: 5 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 11, color: NEUTRALS.textLight, fontWeight: '600' },
  progressBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50, paddingTop: 10 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: NEUTRALS.textLight, marginBottom: 10, letterSpacing: 1 },
  todoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 8, elevation: 1 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, marginRight: 12 },
  itemText: { fontSize: 16, color: NEUTRALS.text, flex: 1 },
  inlineInput: { flex: 1, fontSize: 16, color: NEUTRALS.text, borderBottomWidth: 1, marginRight: 10, padding: 0 },
  miniDeleteBtn: { backgroundColor: '#ddd', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addItemRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12, marginTop: 5, backgroundColor: 'rgba(255,255,255,0.5)' },
  addItemInput: { flex: 1, fontSize: 16, marginLeft: 10 },
  addBtnText: { fontWeight: 'bold', paddingHorizontal: 10 },
  doneItem: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', elevation: 1 },
  doneHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  doneText: { fontSize: 16, color: NEUTRALS.text, flex: 1, fontWeight: '500' },
  doneTotal: { fontSize: 15, fontWeight: 'bold' },
  doneFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 32, alignItems: 'center' },
  doneSub: { fontSize: 12, color: NEUTRALS.textLight },
  actionBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: NEUTRALS.text },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: NEUTRALS.textLight, marginBottom: 6, marginTop: 10 },
  inputBox: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: NEUTRALS.border, borderRadius: 12, padding: 14, fontSize: 16 },
  row: { flexDirection: 'row', gap: 15 },
  btnGhost: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#F3F4F6' },
  btnPrimary: { paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  deleteCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, width: '90%', alignItems: 'center', elevation: 10 },
  deleteIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: NEUTRALS.dangerLight, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  deleteTitle: { fontSize: 20, fontWeight: 'bold', color: NEUTRALS.text, marginBottom: 10 },
  deleteText: { fontSize: 14, color: NEUTRALS.textLight, textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  deleteActions: { flexDirection: 'row', gap: 15, width: '100%' },
  btnCancel: { flex: 1, padding: 15, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' },
  btnDelete: { flex: 1, padding: 15, borderRadius: 14, backgroundColor: NEUTRALS.danger, alignItems: 'center' },
  btnCancelText: { fontWeight: '600', color: NEUTRALS.textLight },
  btnDeleteText: { fontWeight: 'bold', color: '#fff' },
});