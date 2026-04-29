import { useRef, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// expo-camera: componente de câmera e tipo da ref
import { CameraView } from "expo-camera";
// expo-location: busca coordenadas GPS
import * as Location from "expo-location";
// async-storage: leitura e escrita de dados locais persistentes
import AsyncStorage from "@react-native-async-storage/async-storage";

// chave fixa usada para ler/escrever a lista no AsyncStorage
const STORAGE_KEY = "@geovault:segredos";

export default function NovoSegredoScreen() {
  const [texto, setTexto] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // ref para chamar métodos da CameraView (ex: takePictureAsync)
  const cameraRef = useRef<CameraView>(null);

  // handleAbrirCamera | abre a câmera mudando o estado
  const handleAbrirCamera = async () => {
    setIsCameraOpen(true);
  };

  // handleTirarFoto | captura a foto via ref e guarda a URI no estado
  const handleTirarFoto = async () => {
    if (!cameraRef.current) return;
    const foto = await cameraRef.current.takePictureAsync();
    if (foto?.uri) {
      setFotoUri(foto.uri);
    }
    setIsCameraOpen(false);
  };

  // handleSalvarSegredo | busca GPS, monta o objeto e persiste no AsyncStorage
  const handleSalvarSegredo = async () => {
    if (!texto) {
      Alert.alert("Erro", "Digite um segredo primeiro!");
      return;
    }

    // busca a posição atual do GPS com alta precisão
    const posicao = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const novoSegredo = {
      id: Date.now().toString(),
      texto,
      fotoUri,
      latitude: posicao.coords.latitude,
      longitude: posicao.coords.longitude,
    };

    // lê a lista já salva (ou usa array vazio se ainda não existir)
    const dadosSalvos = await AsyncStorage.getItem(STORAGE_KEY);
    const listaAtual = dadosSalvos ? JSON.parse(dadosSalvos) : [];

    // adiciona o novo segredo e persiste
    listaAtual.push(novoSegredo);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(listaAtual));

    setTexto("");
    setFotoUri(null);
    Alert.alert("Salvo!", "Seu segredo foi guardado no cofre.");
  };

  // --- RENDERIZAÇÃO DA CÂMERA EM TELA CHEIA ---
  if (isCameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back" />

        <View style={styles.cameraOverlay}>
          <TouchableOpacity
            style={styles.btnCancelar}
            onPress={() => setIsCameraOpen(false)}
          >
            <Text style={styles.btnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnCapturar}
            onPress={handleTirarFoto}
          >
            <Text style={styles.btnText}>Capturar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- RENDERIZAÇÃO DO FORMULÁRIO NORMAL ---
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Qual o seu segredo neste local?</Text>

      <TextInput
        style={styles.input}
        placeholder="Escreva algo marcante..."
        placeholderTextColor="#666"
        value={texto}
        onChangeText={setTexto}
        multiline
      />

      <View style={styles.fotoContainer}>
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.previewFoto} />
        ) : (
          <TouchableOpacity
            style={styles.btnFotoOutline}
            onPress={handleAbrirCamera}
          >
            <Text style={styles.btnFotoText}>📷 Adicionar Foto ao Segredo</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: "red",
          padding: 10,
          borderRadius: 8,
          marginTop: 8,
        }}
        onPress={async () => {
          await AsyncStorage.removeItem("@geovault:segredos");
          Alert.alert("Limpo", "Todos os segredos foram apagados.");
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>
          Limpar dados (teste)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvarSegredo}>
        <Text style={styles.btnSalvarText}>Salvar Segredo e Localização</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1e1e1e", padding: 20 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  label: { color: "#fff", fontSize: 18, marginBottom: 10, fontWeight: "bold" },
  input: {
    backgroundColor: "#333",
    color: "#fff",
    padding: 15,
    borderRadius: 8,
    minHeight: 100,
    textAlignVertical: "top",
  },
  fotoContainer: { marginVertical: 20, alignItems: "center" },
  previewFoto: { width: "100%", height: 200, borderRadius: 8 },
  btnFotoOutline: {
    borderWidth: 1,
    borderColor: "#007bff",
    borderStyle: "dashed",
    padding: 30,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  btnFotoText: { color: "#007bff", fontSize: 16 },
  btnSalvar: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSalvarText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cameraOverlay: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 48,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  btnCapturar: { backgroundColor: "#28a745", padding: 15, borderRadius: 30 },
  btnCancelar: { backgroundColor: "#dc3545", padding: 15, borderRadius: 30 },
  btnText: { color: "#fff", fontWeight: "bold" },
});
