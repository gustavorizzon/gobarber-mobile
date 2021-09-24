import React, { useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Alert,
  View,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  PermissionsAndroid,
} from 'react-native';
import { Form } from '@unform/mobile';
import { FormHandles } from '@unform/core';
import { ScrollView } from 'react-native-gesture-handler';
import * as Yup from 'yup';
import Icon from 'react-native-vector-icons/Feather';
import ImagePicker from 'react-native-image-picker';

import getValidationErrors from '../../utils/getValidationErrors';
import api from '../../services/api';

import Input from '../../components/Input';
import Button from '../../components/Button';

import {
  Container,
  BackButton,
  Title,
  UserAvatarButton,
  UserAvatar,
} from './styles';
import { useAuth } from '../../hooks/auth';

interface ProfileFormData {
  name: string;
  email: string;
  old_password: string;
  password: string;
  password_confirmation: string;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { goBack } = useNavigation();

  const formRef = useRef<FormHandles>(null);
  const emailInputRef = useRef<TextInput>(null);
  const oldPasswordInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const handleSubmit = useCallback(
    async (data: ProfileFormData) => {
      try {
        formRef.current?.setErrors({});

        const schema = Yup.object().shape({
          name: Yup.string().required('Nome obrigatório'),
          email: Yup.string()
            .required('E-mail obrigatório')
            .email('Digite um e-mail válido'),
          old_password: Yup.string(),
          password: Yup.string().when('old_password', {
            is: (val) => !!val,
            then: Yup.string().required('Campo obrigatório'),
            otherwise: Yup.string(),
          }),
          password_confirmation: Yup.string()
            .when('old_password', {
              is: (val) => !!val,
              then: Yup.string().required('Campo obrigatório'),
              otherwise: Yup.string(),
            })
            .oneOf([Yup.ref('password'), null], 'Confirmação incorreta'),
        });

        await schema.validate(data, { abortEarly: false });

        const {
          name,
          email,
          old_password,
          password,
          password_confirmation,
        } = data;

        const formData = {
          name,
          email,
          ...(old_password
            ? {
                old_password,
                password,
                password_confirmation,
              }
            : {}),
        };

        const response = await api.put('/profile', formData);

        await updateUser(response.data);

        Alert.alert(
          'Perfil atualizado!',
          'Suas informações do perfil foram atualizadas com sucesso!',
        );

        goBack();
      } catch (err) {
        if (err instanceof Yup.ValidationError) {
          const errors = getValidationErrors(err);

          formRef.current?.setErrors(errors);

          return;
        }

        Alert.alert(
          'Erro na atualização',
          'Ocorreu um erro ao atualizar o perfil. Tente novamente.',
        );
      }
    },
    [goBack, updateUser],
  );

  const handleGoBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const requestCameraPermissions = useCallback(async (): Promise<boolean> => {
    const hasCameraPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );

    if (!hasCameraPermission) {
      const requestResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );

      return requestResult === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  }, []);

  const requestReadStoragePermissions = useCallback(async (): Promise<
    boolean
  > => {
    const hasReadStoragePermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );

    if (!hasReadStoragePermission) {
      const requestResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );

      return requestResult === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  }, []);

  const requestWriteStoragePermissions = useCallback(async (): Promise<
    boolean
  > => {
    const hasWriteStoragePermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );

    if (!hasWriteStoragePermission) {
      const requestResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      );

      return requestResult === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  }, []);

  const handleUpdateAvatar = useCallback(async () => {
    if (Platform.OS === 'android') {
      const cameraPermissionGranted = await requestCameraPermissions();
      const readStoragePermissionGranted = await requestReadStoragePermissions();
      const writeStoragePermissionGranted = await requestWriteStoragePermissions();

      if (!cameraPermissionGranted) {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão da sua camera para podermos tirar uma bela foto de perfil sua!',
        );

        return;
      }

      if (!readStoragePermissionGranted) {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão para carregar seus arquivos de imagem!',
        );

        return;
      }

      if (!writeStoragePermissionGranted) {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão para salvar as fotos que você tirar!',
        );

        return;
      }
    }

    ImagePicker.showImagePicker(
      {
        title: 'Selecione um avatar',
        cancelButtonTitle: 'Cancelar',
        takePhotoButtonTitle: 'Usar câmera',
        chooseFromLibraryButtonTitle: 'Escolha da galeria',
        allowsEditing: true,
        quality: 1,
        mediaType: 'photo',
      },
      (response) => {
        if (response.didCancel) return;

        if (response.error) {
          Alert.alert('Erro ao atualizar seu avatar.');
          return;
        }

        const { type, uri, fileName } = response;

        const data = new FormData();

        data.append('avatar', {
          type,
          name: fileName,
          uri,
        });

        api
          .patch('/users/avatar', data)
          .then((apiResponse) => {
            updateUser(apiResponse.data);
          })
          .catch((error) => {
            Alert.alert(
              'Erro ao atualizar o seu avatar',
              JSON.stringify(error),
            );
          });
      },
    );
  }, [
    updateUser,
    requestCameraPermissions,
    requestReadStoragePermissions,
    requestWriteStoragePermissions,
  ]);

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <Container>
            <BackButton onPress={handleGoBack}>
              <Icon name="chevron-left" size={24} color="#999591" />
            </BackButton>

            <UserAvatarButton onPress={handleUpdateAvatar}>
              <UserAvatar source={{ uri: user.avatar_url }} />
            </UserAvatarButton>

            <View>
              <Title>Meu perfil</Title>
            </View>

            <Form initialData={user} ref={formRef} onSubmit={handleSubmit}>
              <Input
                name="name"
                icon="user"
                placeholder="Nome"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
              />
              <Input
                ref={emailInputRef}
                name="email"
                icon="mail"
                placeholder="E-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => oldPasswordInputRef.current?.focus()}
              />

              <Input
                ref={oldPasswordInputRef}
                name="old_password"
                icon="lock"
                placeholder="Senha atual"
                secureTextEntry
                returnKeyType="next"
                containerStyle={{
                  marginTop: 16,
                }}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                textContentType="newPassword"
              />
              <Input
                ref={passwordInputRef}
                name="password"
                icon="lock"
                placeholder="Nova senha"
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                textContentType="newPassword"
              />
              <Input
                ref={confirmPasswordInputRef}
                name="password_confirmation"
                icon="lock"
                placeholder="Confirmar senha"
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={() => formRef.current?.submitForm()}
                textContentType="newPassword"
              />

              <Button onPress={() => formRef.current?.submitForm()}>
                Confirmar mudanças
              </Button>
            </Form>
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

export default Profile;
