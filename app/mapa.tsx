import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

const STORAGE_KEY = "@geovault:segredos";

// latitudeDelta maxima para exibir os pins (acima disso o mapa esta afastado demais)
const ZOOM_MIN = 0.15;

interface Segredo {
  id: string;
  texto: string;
  fotoUri: string | null;
  latitude: number;
  longitude: number;
}

interface Cluster {
  id: string;
  latitude: number;
  longitude: number;
  segredos: Segredo[];
}

// calcularClusters | agrupa segredos proximos com base no zoom atual
function calcularClusters(segredos: Segredo[], regiao: Region): Cluster[] {
  const threshold = regiao.latitudeDelta * 0.12;
  const clusters: Cluster[] = [];

  for (const segredo of segredos) {
    let encontrado = false;
    for (const cluster of clusters) {
      if (
        Math.abs(segredo.latitude - cluster.latitude) < threshold &&
        Math.abs(segredo.longitude - cluster.longitude) < threshold
      ) {
        cluster.segredos.push(segredo);
        encontrado = true;
        break;
      }
    }
    if (!encontrado) {
      clusters.push({
        id: segredo.id,
        latitude: segredo.latitude,
        longitude: segredo.longitude,
        segredos: [segredo],
      });
    }
  }

  return clusters;
}

export default function MapaScreen() {
  const [segredos, setSegredos] = useState<Segredo[]>([]);
  const [localizacao, setLocalizacao] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [regiao, setRegiao] = useState<Region | null>(null);
  // segredo individual aberto no modal de detalhes
  const [segredoSelecionado, setSegredoSelecionado] = useState<Segredo | null>(
    null,
  );
  // cluster com multiplos segredos aguardando selecao
  const [clusterSelecionado, setClusterSelecionado] = useState<Cluster | null>(
    null,
  );

  useEffect(() => {
    // usarPosicao | aplica a posicao recebida no estado
    const usarPosicao = (pos: Location.LocationObject) => {
      const r: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setLocalizacao({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setRegiao(r);
    };

    Location.getLastKnownPositionAsync().then((ultima) => {
      if (ultima) {
        usarPosicao(ultima);
      } else {
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).then(usarPosicao);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarSegredos();
    }, []),
  );

  // carregarSegredos | le o JSON do AsyncStorage e popula o estado
  const carregarSegredos = async () => {
    const dadosSalvos = await AsyncStorage.getItem(STORAGE_KEY);
    setSegredos(dadosSalvos ? JSON.parse(dadosSalvos) : []);
  };

  // recalcula clusters sempre que os segredos ou a regiao mudam
  const clusters = useMemo(() => {
    if (!regiao) return [];
    return calcularClusters(segredos, regiao);
  }, [segredos, regiao]);

  // pins so ficam visiveis quando o zoom esta no nivel de ruas
  const mostrarPins = regiao ? regiao.latitudeDelta < ZOOM_MIN : false;

  // handlePressCluster | abre detalhes direto ou modal de selecao
  const handlePressCluster = (cluster: Cluster) => {
    if (cluster.segredos.length === 1) {
      setSegredoSelecionado(cluster.segredos[0]);
    } else {
      setClusterSelecionado(cluster);
    }
  };

  if (!localizacao || !regiao) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingTexto}>Buscando localizacao...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={regiao}
        onRegionChangeComplete={setRegiao}
      >
        {mostrarPins &&
          clusters.map((cluster) => (
            <Marker
              key={cluster.id}
              coordinate={{
                latitude: cluster.latitude,
                longitude: cluster.longitude,
              }}
              onPress={() => handlePressCluster(cluster)}
              anchor={{ x: 0.5, y: 1 }}
            >
              {cluster.segredos.length === 1 ? (
                cluster.segredos[0].fotoUri ? (
                  <Image
                    source={{ uri: cluster.segredos[0].fotoUri }}
                    style={styles.pinFoto}
                  />
                ) : (
                  <View style={styles.pinSemFoto}>
                    <Text style={styles.pinEmoji}>📍</Text>
                  </View>
                )
              ) : (
                <View style={styles.pinCluster}>
                  {cluster.segredos.slice(0, 4).map((s, i) =>
                    s.fotoUri ? (
                      <Image
                        key={i}
                        source={{ uri: s.fotoUri }}
                        style={styles.pinClusterFoto}
                      />
                    ) : (
                      <View
                        key={i}
                        style={[styles.pinClusterFoto, styles.pinClusterVazio]}
                      >
                        <Text style={{ fontSize: 10 }}>📍</Text>
                      </View>
                    ),
                  )}
                </View>
              )}
            </Marker>
          ))}
      </MapView>

      {segredos.length === 0 && (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            Nenhum segredo salvo ainda. Va na outra aba!
          </Text>
        </View>
      )}

      {!mostrarPins && segredos.length > 0 && (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            Aproxime o mapa para ver os segredos
          </Text>
        </View>
      )}

      {/* modal de selecao exibido ao tocar num cluster com multiplos segredos */}
      <Modal
        visible={clusterSelecionado !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setClusterSelecionado(null)}
      >
        <Pressable
          style={styles.modalFundo}
          onPress={() => setClusterSelecionado(null)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>
              {clusterSelecionado?.segredos.length} segredos neste local
            </Text>
            <ScrollView
              style={{ width: "100%" }}
              contentContainerStyle={styles.clusterLista}
            >
              {clusterSelecionado?.segredos.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.clusterItem}
                  onPress={() => {
                    setClusterSelecionado(null);
                    setSegredoSelecionado(s);
                  }}
                >
                  {s.fotoUri ? (
                    <Image
                      source={{ uri: s.fotoUri }}
                      style={styles.clusterItemFoto}
                    />
                  ) : (
                    <View
                      style={[
                        styles.clusterItemFoto,
                        styles.clusterItemSemFoto,
                      ]}
                    >
                      <Text style={{ fontSize: 24 }}>📍</Text>
                    </View>
                  )}
                  <Text style={styles.clusterItemTexto} numberOfLines={2}>
                    {s.texto}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* modal de detalhes do segredo individual */}
      <Modal
        visible={segredoSelecionado !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSegredoSelecionado(null)}
      >
        <Pressable
          style={styles.modalFundo}
          onPress={() => setSegredoSelecionado(null)}
        >
          <View style={styles.modalCard}>
            {segredoSelecionado?.fotoUri && (
              <Image
                source={{ uri: segredoSelecionado.fotoUri }}
                style={styles.modalFoto}
              />
            )}
            <Text style={styles.modalTexto}>{segredoSelecionado?.texto}</Text>
            <TouchableOpacity
              style={styles.modalBtnFechar}
              onPress={() => setSegredoSelecionado(null)}
            >
              <Text style={styles.modalBtnTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTexto: { color: "#fff", fontSize: 16 },
  map: { width: "100%", height: "100%" },
  pinFoto: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#007bff",
  },
  pinSemFoto: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#007bff",
  },
  pinEmoji: { fontSize: 28 },
  pinCluster: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 66,
    height: 66,
    padding: 5,
    backgroundColor: "#007bff",
    borderRadius: 10,
  },
  pinClusterFoto: {
    width: 26,
    height: 26,
    borderRadius: 4,
    margin: 1,
  },
  pinClusterVazio: {
    backgroundColor: "#555",
    alignItems: "center",
    justifyContent: "center",
  },

  aviso: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 20,
  },
  avisoTexto: { color: "#fff" },
  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    alignItems: "center",
    gap: 12,
    maxHeight: "80%",
  },
  modalTitulo: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  modalFoto: {
    width: "100%",
    height: 220,
    borderRadius: 8,
  },
  modalTexto: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  modalBtnFechar: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  modalBtnTexto: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  clusterLista: {
    paddingVertical: 8,
  },
  clusterItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  clusterItemFoto: {
    width: 56,
    height: 56,
    borderRadius: 6,
    marginRight: 12,
    flexShrink: 0,
  },
  clusterItemSemFoto: {
    backgroundColor: "#555",
    alignItems: "center",
    justifyContent: "center",
  },
  clusterItemTexto: {
    color: "#fff",
    flex: 1,
    fontSize: 14,
  },
});
