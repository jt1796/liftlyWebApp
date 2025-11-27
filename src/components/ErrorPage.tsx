import React from 'react';
import { Button, Container, Typography, Box } from '@mui/material';
import { Link } from 'react-router-dom';

const ErrorPage: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Something Went Wrong
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          We're sorry, but an unexpected error has occurred.
        </Typography>
        <Button component={Link} to="/" variant="contained" color="primary">
          Go to Homepage
        </Button>
      </Box>
    </Container>
  );
};

export default ErrorPage;
