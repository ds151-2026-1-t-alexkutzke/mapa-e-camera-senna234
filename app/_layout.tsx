import { FontAwesome } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import { useForegroundPermissions } from "expo-location";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Layout() {
  // status atual e função de requisição para câmera
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  // status atual e função de requisição para localização em primeiro plano
  const [locationPermission, requestLocationPermission] =
    useForegroundPermissions();

  // dispara o pedido de permissão da câmera assim que o status for carregado e não estiver concedido
  useEffect(() => {
    if (
      cameraPermission &&
      !cameraPermission.granted &&
      cameraPermission.canAskAgain
    ) {
      requestCameraPermission();
    }
  }, [cameraPermission]);

  // dispara o pedido de permissão de localização assim que o status for carregado e não estiver concedido
  useEffect(() => {
    if (
      locationPermission &&
      !locationPermission.granted &&
      locationPermission.canAskAgain
    ) {
      requestLocationPermission();
    }
  }, [locationPermission]);

  // aguarda os hooks carregarem o status real das permissões
  if (!cameraPermission || !locationPermission) {
    return null;
  }

  // bloqueia a navegação se o usuário negou permanentemente e não podemos pedir novamente
  if (!cameraPermission.granted || !locationPermission.granted) {
    return (
      <View style={styles.bloqueio}>
        <Text style={styles.titulo}>Permissões Necessárias</Text>
        <Text style={styles.texto}>
          O GeoVault precisa de acesso à câmera e à localização para funcionar.
        </Text>
        <TouchableOpacity
          style={styles.botao}
          onPress={() => {
            requestCameraPermission();
            requestLocationPermission();
          }}
        >
          <Text style={styles.botaoTexto}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#007bff",
        headerStyle: { backgroundColor: "#121212" },
        headerTintColor: "#fff",
        tabBarStyle: { backgroundColor: "#121212", borderTopColor: "#333" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Novo Segredo",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="lock" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: "Meu Mapa",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="map" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bloqueio: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  titulo: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  texto: {
    color: "#aaa",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 32,
  },
  botao: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  botaoTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
