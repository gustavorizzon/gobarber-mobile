import React from 'react';

import { useAuth } from '../../hooks/auth';

import { Container, SignOutButton, SignOutButtonText } from './styles';

const Dashboard: React.FC = () => {
  const { signOut } = useAuth();

  return (
    <Container>
      <SignOutButton title="Sign Out" onPress={() => signOut()}>
        <SignOutButtonText>Sign Out</SignOutButtonText>
      </SignOutButton>
    </Container>
  );
};

export default Dashboard;
