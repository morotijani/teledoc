import React, { createContext, useContext, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { API_URL } from '../api/client';
import { COLORS, FONTS } from '../theme/theme';

const { width, height } = Dimensions.get('window');

interface DocumentViewerContextType {
  openDocument: (rawUrl: string, title?: string) => void;
  closeDocument: () => void;
}

const DocumentViewerContext = createContext<DocumentViewerContextType>({
  openDocument: () => {},
  closeDocument: () => {},
});

const isImageFile = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);

const resolveUrl = (rawUrl: string) => {
  const baseServer = API_URL.replace('/api/v1', '');
  return rawUrl.replace(/http:\/\/localhost:\d+/, baseServer);
};

export const DocumentViewerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [docUrl, setDocUrl] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('Document');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const openDocument = (rawUrl: string, title?: string) => {
    if (!rawUrl) return;
    const resolved = resolveUrl(rawUrl);
    setDocUrl(resolved);
    setDocTitle(title || 'Medical Document');
    setIsLoading(true);
    setHasError(false);
    setVisible(true);
  };

  const closeDocument = () => {
    setVisible(false);
    setDocUrl('');
  };

  const isImg = isImageFile(docUrl);

  return (
    <DocumentViewerContext.Provider value={{ openDocument, closeDocument }}>
      {children}

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeDocument}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Top Viewer Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={closeDocument}>
              <MaterialIcons name="close" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {docTitle}
              </Text>
              <Text style={styles.headerSub}>
                {isImg ? 'Image Preview' : 'In-App Document Viewer'}
              </Text>
            </View>

            <View style={styles.secureBadge}>
              <MaterialIcons name="lock" size={13} color="#2DD4BF" />
              <Text style={styles.secureBadgeText}>In-App</Text>
            </View>
          </View>

          {/* Content Area */}
          <View style={styles.body}>
            {isImg ? (
              <ScrollView
                style={styles.imageScroll}
                contentContainerStyle={styles.imageScrollContent}
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
              >
                <Image
                  source={{ uri: docUrl }}
                  style={styles.fullImage}
                  resizeMode="contain"
                  onLoadEnd={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                  }}
                />
              </ScrollView>
            ) : (
              <WebView
                source={{ uri: docUrl }}
                style={styles.webview}
                originWhitelist={['*']}
                scalesPageToFit
                onLoadEnd={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            )}

            {isLoading && (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loaderText}>Loading document...</Text>
              </View>
            )}

            {hasError && !isLoading && (
              <View style={styles.errorOverlay}>
                <MaterialIcons name="broken-image" size={40} color={COLORS.textSubtle} />
                <Text style={styles.errorTitle}>Unable to Render Document</Text>
                <Text style={styles.errorSub}>
                  Ensure your phone is connected to the TeleDoc server network and try again.
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={closeDocument}>
                  <Text style={styles.retryBtnText}>Close Viewer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </DocumentViewerContext.Provider>
  );
};

export const useDocumentViewer = () => useContext(DocumentViewerContext);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.navy,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.navyLight,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#94A3B8',
    marginTop: 1,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.navyLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  secureBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#2DD4BF',
  },
  body: {
    flex: 1,
    backgroundColor: '#0B1120',
    position: 'relative',
  },
  imageScroll: {
    flex: 1,
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width,
    height: height * 0.78,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.white,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginTop: 12,
  },
  errorSub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
});
